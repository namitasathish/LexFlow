/**
 * Mock for expo-sqlite to allow DB tests to run in Node.
 * Simulates an in-memory database using a simple Javascript object.
 */

class SQLiteMock {
    constructor() {
        this.tables = {
            cases: []
        };
    }

    async execAsync(sql) {
        // console.log('MOCK SQL EXEC:', sql);
        return { rowsAffected: 0 };
    }

    async runAsync(sql, params) {
        if (sql.startsWith('INSERT INTO cases')) {
            const id = params[0];
            const title = params[1];
            this.tables.cases.push({ id, case_title: title, status: params[8] || 'Open' });
            return { lastInsertRowId: this.tables.cases.length, changes: 1 };
        }

        if (sql.startsWith('UPDATE cases')) {
            const title = params[0];
            const id = params[10];
            const index = this.tables.cases.findIndex(c => c.id === id);
            if (index !== -1) {
                this.tables.cases[index].case_title = title;
                return { changes: 1 };
            }
            return { changes: 0 };
        }

        if (sql.startsWith('DELETE FROM cases')) {
            const id = params[0];
            const initialLength = this.tables.cases.length;
            this.tables.cases = this.tables.cases.filter(c => c.id !== id);
            return { changes: initialLength - this.tables.cases.length };
        }

        return { changes: 0 };
    }

    async getFirstAsync(sql, params) {
        if (sql.includes('SELECT * FROM cases WHERE id = ?')) {
            return this.tables.cases.find(c => c.id === params[0]) || null;
        }
        return null;
    }

    async getAllAsync(sql, params) {
        if (sql.includes('SELECT * FROM cases')) {
            return this.tables.cases;
        }
        return [];
    }
}

module.exports = SQLiteMock;
