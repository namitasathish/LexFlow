/**
 * Migrations with PRAGMA user_version.
 * Keep this file append-only: add new migration blocks as versions increase.
 */

const DB_VERSION = 5;

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
export async function migrateIfNeeded(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DB_VERSION) return;

  // v1 - initial schema
  if (currentVersion < 1) {
    await db.execAsync(`
      PRAGMA foreign_keys = ON;
 
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT
      );
 
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY NOT NULL,
        case_title TEXT NOT NULL,
        court_name TEXT,
        client_id TEXT,
        filing_date TEXT,
        next_hearing_date TEXT,
        deadline_date TEXT,
        priority TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Open',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
      );
 
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        case_id TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        reminder_set INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
 
      CREATE TABLE IF NOT EXISTS closed_cases (
        id TEXT PRIMARY KEY NOT NULL,
        case_id TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        delay_notes TEXT,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
 
      CREATE INDEX IF NOT EXISTS idx_cases_deadline_date ON cases(deadline_date);
      CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_case_id ON tasks(case_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `);

    currentVersion = 1;
  }

  // v2 - Bare acts, FIRs, documents
  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS bare_acts (
        id TEXT PRIMARY KEY NOT NULL,
        act_title TEXT NOT NULL,
        section TEXT,
        content TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        bookmarked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS firs (
        id TEXT PRIMARY KEY NOT NULL,
        case_id TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY NOT NULL,
        case_id TEXT,
        name TEXT NOT NULL,
        uri TEXT,
        category TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_bare_acts_title ON bare_acts(act_title);
      CREATE INDEX IF NOT EXISTS idx_bare_acts_language ON bare_acts(language);
      CREATE INDEX IF NOT EXISTS idx_firs_case_id ON firs(case_id);
      CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
    `);

    // Seed a couple of example bare acts for demo
    await db.execAsync(`
      INSERT OR IGNORE INTO bare_acts (id, act_title, section, content, language, bookmarked)
      VALUES
        ('act_ipc_1', 'Indian Penal Code, 1860', 'Section 420', 'Cheating and dishonestly inducing delivery of property.', 'en', 0),
        ('act_cpc_1', 'Code of Civil Procedure, 1908', 'Order 7 Rule 1', 'Particulars to be contained in a plaint.', 'en', 0);
    `);

    currentVersion = 2;
  }

  // v3 - CRM interactions, activity log, extend closed_cases & documents
  if (currentVersion < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS client_interactions (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL,
        type TEXT NOT NULL,
        summary TEXT,
        interaction_date TEXT NOT NULL,
        follow_up_date TEXT,
        follow_up_done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions(client_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_followup ON client_interactions(follow_up_date);
      CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);
    `);

    // Extend closed_cases safely
    try { await db.execAsync(`ALTER TABLE closed_cases ADD COLUMN close_date TEXT;`); } catch (e) { }
    try { await db.execAsync(`ALTER TABLE closed_cases ADD COLUMN outcome TEXT;`); } catch (e) { }

    // Extend documents with file metadata
    try { await db.execAsync(`ALTER TABLE documents ADD COLUMN file_size INTEGER;`); } catch (e) { }
    try { await db.execAsync(`ALTER TABLE documents ADD COLUMN file_type TEXT;`); } catch (e) { }
    try { await db.execAsync(`ALTER TABLE documents ADD COLUMN uploaded_at TEXT;`); } catch (e) { }
    try { await db.execAsync(`ALTER TABLE documents ADD COLUMN client_id TEXT REFERENCES clients(id) ON DELETE SET NULL;`); } catch (e) { }

    currentVersion = 3;
  }

  // v4 - Authentication
  if (currentVersion < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    currentVersion = 4;
  }

  // v5 - Demo Seeding
  if (currentVersion < 5) {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
    const twoDaysLater = new Date(Date.now() + 172800000).toISOString();

    await db.execAsync(`
      -- Seed User
      INSERT OR IGNORE INTO users (id, name, email, password, created_at)
      VALUES ('u_demo', 'Demo Lawyer', 'demo@gmail.com', 'password123', '${now}');

      -- Seed Clients
      INSERT OR IGNORE INTO clients (id, name, phone, email, address)
      VALUES 
        ('cl_1', 'Arjun Sharma', '9876543210', 'arjun.s@example.com', 'Mumbai, India'),
        ('cl_2', 'Priya Nair', '8765432109', 'priya.n@example.com', 'Bangalore, India'),
        ('cl_3', 'John Doe', '7654321098', 'john.d@example.com', 'Delhi, India');

      -- Seed Cases
      INSERT OR IGNORE INTO cases (id, case_title, court_name, client_id, priority, status, deadline_date, filing_date, created_at, updated_at)
      VALUES 
        ('c_1', 'Property Dispute - Sharma', 'High Court', 'cl_1', 'High', 'Open', '${twoDaysLater}', '${now}', '${now}', '${now}'),
        ('c_2', 'Contract Breach - Nair', 'District Court', 'cl_2', 'Medium', 'Open', '${tomorrow}', '${now}', '${now}', '${now}'),
        ('c_3', 'Divorce Case - Doe', 'Family Court', 'cl_3', 'Low', 'Closed', '${yesterday}', '${twoDaysAgo}', '${twoDaysAgo}', '${now}'),
        ('c_4', 'Criminal Appeal - State vs Singh', 'Supreme Court', NULL, 'High', 'Open', '${twoDaysAgo}', '${twoDaysAgo}', '${twoDaysAgo}', '${now}');

      -- Seed Tasks
      INSERT OR IGNORE INTO tasks (id, case_id, title, due_date, completed)
      VALUES 
        ('t_1', 'c_1', 'Draft Plaint', '${now}', 0),
        ('t_2', 'c_1', 'Gather Evidence', '${tomorrow}', 0),
        ('t_3', 'c_2', 'Review Contract', '${now}', 1),
        ('t_4', 'c_4', 'File Appeal', '${twoDaysAgo}', 0);

      -- Seed Closed Case Details
      INSERT OR IGNORE INTO closed_cases (id, case_id, duration_days, delay_notes, close_date, outcome)
      VALUES ('cc_1', 'c_3', 30, 'Resolution via mediation', '${now}', 'Settled');

      -- Seed Extra Bare Acts
      INSERT OR IGNORE INTO bare_acts (id, act_title, section, content, language, bookmarked)
      VALUES
        ('act_crpc_1', 'Code of Criminal Procedure, 1973', 'Section 154', 'Information in cognizable cases.', 'en', 1),
        ('act_iea_1', 'Indian Evidence Act, 1872', 'Section 3', 'Interpretation-clause (Fact, Relevant facts, etc.)', 'en', 0),
        ('act_const_1', 'Constitution of India', 'Article 21', 'Protection of life and personal liberty.', 'en', 1);

      -- Seed Activity Log
      INSERT OR IGNORE INTO activity_log (id, entity_type, entity_id, action, description, timestamp)
      VALUES ('log_demo_1', 'user', 'u_demo', 'signup', 'Account created automatically for demo', '${now}');
    `);

    currentVersion = 5;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
}

