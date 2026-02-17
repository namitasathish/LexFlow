import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb, makeId } from '../database/db';
import { getUrgentCases, getWeeklyCases, getTodayCases } from '../utils/deadlineEngine';
import {
  requestNotificationPermission,
  scheduleCaseAlerts,
  cancelCaseAlerts,
} from '../utils/notifications';

const AppContext = createContext(null);
const USER_SESSION_KEY = '@lawyer_session';

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);

  // -------- AUTH LOGIC --------
  const register = useCallback(async (name, email, password) => {
    const db = await getDb();
    const id = makeId('u');
    const now = new Date().toISOString();
    try {
      await db.runAsync(
        'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, name.trim(), email.trim().toLowerCase(), password, now]
      );
      const newUser = { id, name, email };
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (e) {
      console.warn('Register error', e);
      return { success: false, error: 'Email already exists or database error.' };
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const db = await getDb();
    try {
      const u = await db.getFirstAsync(
        'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
        [email.trim().toLowerCase(), password]
      );
      if (u) {
        await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(u));
        setUser(u);
        return { success: true };
      }
      return { success: false, error: 'Invalid email or password.' };
    } catch (e) {
      console.warn('Login error', e);
      return { success: false, error: 'Technical error during login.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  }, []);

  // -------- ACTIVITY LOG HELPER --------
  const logActivity = useCallback(async (entityType, entityId, action, description) => {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT INTO activity_log (id, entity_type, entity_id, action, description, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [makeId('log'), entityType, entityId, action, description || '', new Date().toISOString()]
      );
    } catch (e) {
      console.warn('logActivity error', e);
    }
  }, []);

  /**
   * Load session and all core entities from SQLite.
   */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load Session
      const saved = await AsyncStorage.getItem(USER_SESSION_KEY);
      if (saved) setUser(JSON.parse(saved));

      // 2. Load Data
      const db = await getDb();
      const c = await db.getAllAsync(
        `SELECT * FROM cases ORDER BY datetime(updated_at) DESC`
      );
      const cl = await db.getAllAsync(
        `SELECT * FROM clients ORDER BY lower(name) ASC`
      );
      const t = await db.getAllAsync(
        `SELECT * FROM tasks ORDER BY completed ASC, datetime(due_date) ASC`
      );
      setCases(c ?? []);
      setClients(cl ?? []);
      setTasks(t ?? []);
    } catch (e) {
      console.error('loadAll error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // -------- CASE CRUD --------
  const createCase = useCallback(
    async (payload) => {
      const db = await getDb();
      const now = new Date().toISOString();
      const id = payload.id || makeId('case');
      await db.runAsync(
        `INSERT INTO cases (
          id, case_title, court_name, client_id,
          filing_date, next_hearing_date, deadline_date,
          priority, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.case_title?.trim() || '',
          payload.court_name?.trim() || '',
          payload.client_id || null,
          payload.filing_date || null,
          payload.next_hearing_date || null,
          payload.deadline_date || null,
          payload.priority || 'Medium',
          payload.status || 'Open',
          payload.notes?.trim() || '',
          now,
          now,
        ]
      );

      await requestNotificationPermission().catch(() => { });
      await scheduleCaseAlerts({ ...payload, id }).catch(() => { });
      await logActivity('case', id, 'created', `Created case: ${payload.case_title?.trim() || 'Untitled'}`);
      await loadAll();
      return id;
    },
    [loadAll, logActivity]
  );

  const updateCase = useCallback(
    async (caseId, updates) => {
      const db = await getDb();
      const now = new Date().toISOString();
      const existing = await db.getFirstAsync('SELECT * FROM cases WHERE id = ?', caseId);
      if (!existing) return;

      const merged = { ...existing, ...updates, updated_at: now };
      await db.runAsync(
        `UPDATE cases SET
          case_title = ?, court_name = ?, client_id = ?,
          filing_date = ?, next_hearing_date = ?, deadline_date = ?,
          priority = ?, status = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          merged.case_title?.trim() || '',
          merged.court_name?.trim() || '',
          merged.client_id || null,
          merged.filing_date || null,
          merged.next_hearing_date || null,
          merged.deadline_date || null,
          merged.priority || 'Medium',
          merged.status || 'Open',
          merged.notes?.trim() || '',
          now,
          caseId,
        ]
      );

      await cancelCaseAlerts(caseId).catch(() => { });
      await requestNotificationPermission().catch(() => { });
      await scheduleCaseAlerts(merged).catch(() => { });
      await logActivity('case', caseId, 'updated', `Updated case: ${merged.case_title?.trim() || ''}`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  const deleteCase = useCallback(
    async (caseId) => {
      const db = await getDb();
      const c = await db.getFirstAsync('SELECT case_title FROM cases WHERE id = ?', caseId);
      await cancelCaseAlerts(caseId).catch(() => { });
      await db.runAsync('DELETE FROM cases WHERE id = ?', [caseId]);
      await logActivity('case', caseId, 'deleted', `Deleted case: ${c?.case_title || caseId}`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  const closeCase = useCallback(
    async (caseId, delay_notes = '', outcome = '') => {
      const db = await getDb();
      const c = await db.getFirstAsync('SELECT * FROM cases WHERE id = ?', caseId);
      if (!c) return;
      const now = new Date().toISOString();
      const start = c.created_at ? new Date(c.created_at) : new Date();
      const end = new Date();
      const durationDays = Math.max(
        0,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
      await db.runAsync('UPDATE cases SET status = ?, updated_at = ? WHERE id = ?', [
        'Closed',
        now,
        caseId,
      ]);
      await db.runAsync(
        'INSERT INTO closed_cases (id, case_id, duration_days, delay_notes, close_date, outcome) VALUES (?, ?, ?, ?, ?, ?)',
        [makeId('closed'), caseId, durationDays, delay_notes?.trim() || '', now, outcome || '']
      );
      await cancelCaseAlerts(caseId).catch(() => { });
      await logActivity('case', caseId, 'closed', `Closed case: ${c.case_title} (${durationDays} days, ${outcome || 'no outcome'})`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  // -------- CLIENT CRUD --------
  const createClient = useCallback(
    async (payload) => {
      const db = await getDb();
      const id = payload.id || makeId('client');
      await db.runAsync(
        `INSERT INTO clients (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          payload.name?.trim() || '',
          payload.phone?.trim() || '',
          payload.email?.trim() || '',
          payload.address?.trim() || '',
        ]
      );
      await logActivity('client', id, 'created', `Added client: ${payload.name?.trim() || ''}`);
      await loadAll();
      return id;
    },
    [loadAll, logActivity]
  );

  const updateClient = useCallback(
    async (clientId, updates) => {
      const db = await getDb();
      const existing = await db.getFirstAsync('SELECT * FROM clients WHERE id = ?', clientId);
      if (!existing) return;
      const merged = { ...existing, ...updates };
      await db.runAsync(
        `UPDATE clients SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
        [
          merged.name?.trim() || '',
          merged.phone?.trim() || '',
          merged.email?.trim() || '',
          merged.address?.trim() || '',
          clientId,
        ]
      );
      await logActivity('client', clientId, 'updated', `Updated client: ${merged.name?.trim() || ''}`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  const deleteClient = useCallback(
    async (clientId) => {
      const db = await getDb();
      const cl = await db.getFirstAsync('SELECT name FROM clients WHERE id = ?', clientId);
      await db.runAsync('DELETE FROM clients WHERE id = ?', [clientId]);
      await logActivity('client', clientId, 'deleted', `Deleted client: ${cl?.name || clientId}`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  // -------- TASK CRUD --------
  const addTask = useCallback(
    async (caseId, payload) => {
      const db = await getDb();
      const id = payload.id || makeId('task');
      await db.runAsync(
        `INSERT INTO tasks (id, case_id, title, due_date, completed, reminder_set) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          caseId,
          payload.title?.trim() || '',
          payload.due_date || null,
          payload.completed ? 1 : 0,
          payload.reminder_set ? 1 : 0,
        ]
      );
      await logActivity('task', id, 'created', `Added task: ${payload.title?.trim() || ''}`);
      await loadAll();
      return id;
    },
    [loadAll, logActivity]
  );

  const setTaskCompleted = useCallback(
    async (taskId, completed) => {
      const db = await getDb();
      await db.runAsync('UPDATE tasks SET completed = ? WHERE id = ?', [completed ? 1 : 0, taskId]);
      const t = await db.getFirstAsync('SELECT title FROM tasks WHERE id = ?', taskId);
      await logActivity('task', taskId, completed ? 'completed' : 'reopened', `${completed ? 'Completed' : 'Reopened'} task: ${t?.title || taskId}`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      const db = await getDb();
      const t = await db.getFirstAsync('SELECT title FROM tasks WHERE id = ?', taskId);
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [taskId]);
      await logActivity('task', taskId, 'deleted', `Deleted task: ${t?.title || taskId}`);
      await loadAll();
    },
    [loadAll, logActivity]
  );

  // -------- CLIENT INTERACTIONS (CRM) --------
  const addInteraction = useCallback(
    async (clientId, payload) => {
      const db = await getDb();
      const id = makeId('interaction');
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO client_interactions (id, client_id, type, summary, interaction_date, follow_up_date, follow_up_done, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clientId,
          payload.type || 'note',
          payload.summary?.trim() || '',
          payload.interaction_date || now,
          payload.follow_up_date || null,
          0,
          now,
        ]
      );
      await logActivity('interaction', id, 'created', `Logged ${payload.type}: ${payload.summary?.trim() || ''}`);
      return id;
    },
    [logActivity]
  );

  const getClientInteractions = useCallback(async (clientId) => {
    const db = await getDb();
    const rows = await db.getAllAsync(
      'SELECT * FROM client_interactions WHERE client_id = ? ORDER BY datetime(interaction_date) DESC',
      [clientId]
    );
    return rows ?? [];
  }, []);

  const markFollowUpDone = useCallback(async (interactionId) => {
    const db = await getDb();
    await db.runAsync('UPDATE client_interactions SET follow_up_done = 1 WHERE id = ?', [interactionId]);
    await logActivity('interaction', interactionId, 'follow_up_done', 'Follow-up marked as done');
  }, [logActivity]);

  const getPendingFollowUps = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT ci.*, c.name as client_name
       FROM client_interactions ci
       LEFT JOIN clients c ON ci.client_id = c.id
       WHERE ci.follow_up_date IS NOT NULL AND ci.follow_up_done = 0
       ORDER BY datetime(ci.follow_up_date) ASC`
    );
    return rows ?? [];
  }, []);

  // -------- ACTIVITY LOG --------
  const getActivityLog = useCallback(async (limit = 50) => {
    const db = await getDb();
    const rows = await db.getAllAsync(
      'SELECT * FROM activity_log ORDER BY datetime(timestamp) DESC LIMIT ?',
      [limit]
    );
    return rows ?? [];
  }, []);

  // -------- CLOSED CASE ANALYTICS --------
  const getClosedCaseStats = useCallback(async () => {
    const db = await getDb();
    const all = await db.getAllAsync(
      `SELECT cc.*, cs.case_title, cs.court_name, cs.priority, cs.client_id
       FROM closed_cases cc
       LEFT JOIN cases cs ON cc.case_id = cs.id
       ORDER BY datetime(cc.close_date) DESC`
    );
    const rows = all ?? [];
    const totalClosed = rows.length;
    const avgDuration = totalClosed > 0
      ? Math.round(rows.reduce((s, r) => s + (r.duration_days || 0), 0) / totalClosed)
      : 0;

    // Group by court
    const byCourt = {};
    for (const r of rows) {
      const court = r.court_name || 'Unknown';
      if (!byCourt[court]) byCourt[court] = { count: 0, totalDays: 0 };
      byCourt[court].count++;
      byCourt[court].totalDays += r.duration_days || 0;
    }
    for (const k of Object.keys(byCourt)) {
      byCourt[k].avgDays = Math.round(byCourt[k].totalDays / byCourt[k].count);
    }

    return { rows, totalClosed, avgDuration, byCourt };
  }, []);

  // -------- DEADLINE COMPANION --------
  const urgentCases = useMemo(() => getUrgentCases(cases), [cases]);
  const weeklyCases = useMemo(() => getWeeklyCases(cases), [cases]);
  const todayCases = useMemo(() => getTodayCases(cases), [cases]);

  const clientsById = useMemo(() => {
    const map = new Map();
    for (const cl of clients) map.set(cl.id, cl);
    return map;
  }, [clients]);

  const tasksByCaseId = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const list = map.get(t.case_id) || [];
      list.push(t);
      map.set(t.case_id, list);
    }
    return map;
  }, [tasks]);

  const value = {
    loading,
    user,
    cases,
    clients,
    tasks,
    urgentCases,
    weeklyCases,
    todayCases,
    clientsById,
    tasksByCaseId,
    loadAll,
    logActivity,
    // auth
    register,
    login,
    logout,
    // case
    createCase,
    updateCase,
    deleteCase,
    closeCase,
    // client
    createClient,
    updateClient,
    deleteClient,
    // task
    addTask,
    setTaskCompleted,
    deleteTask,
    // CRM
    addInteraction,
    getClientInteractions,
    markFollowUpDone,
    getPendingFollowUps,
    // analytics
    getActivityLog,
    getClosedCaseStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
