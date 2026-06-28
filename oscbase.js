const fs = require('fs');

class OscBase {
    constructor(dbFile = 'oscbase.log') {
        this.dbFile = dbFile;
        this.memTable = new Map(); // Lightning fast in-memory store
        this.init();
    }

    // Recover data by reading from your local hard disk log file
    init() {
        try {
            if (!fs.existsSync(this.dbFile)) {
                fs.writeFileSync(this.dbFile, '');
                return;
            }

            console.log("⏳ Rebuilding OscBase indices from data log...");
            const fileContent = fs.readFileSync(this.dbFile, 'utf-8');
            if (!fileContent.trim()) return;

            // Handle clean splits even if strings are massive
            const lines = fileContent.split('\n');
            
            for (let line of lines) {
                if (!line.trim()) continue;
                try {
                    const { op, key, value } = JSON.parse(line);
                    if (op === 'SET') {
                        this.memTable.set(key, value);
                    } else if (op === 'DELETE') {
                        this.memTable.delete(key);
                    }
                } catch (e) {
                    // Skips corrupted or half-written line entries gracefully
                    continue; 
                }
            }
            console.log(`🔄 OscBase initialized successfully. Ready with ${this.memTable.size} primary keys.`);
        } catch (err) {
            console.error("Critical recovery failure inside OscBase filesystem initialize layout:", err);
        }
    }

    // Write Data: Log to disk first, then update RAM state
    set(key, value) {
        try {
            const logEntry = { op: 'SET', key, value };
            
            // Append line directly to your file database
            fs.appendFileSync(this.dbFile, JSON.stringify(logEntry) + '\n');
            
            // Update the live RAM table
            this.memTable.set(key, value);
            
            return { success: true, key };
        } catch (err) {
            console.error(`Write failed for key: ${key}`, err);
            return { success: false, error: "Disk append block sequence error." };
        }
    }

    // Read Data: Instant grab from memory
    get(key) {
        if (this.memTable.has(key)) {
            return { success: true, key, value: this.memTable.get(key) };
        }
        return { success: false, error: `Key alignment error: '${key}' not found.` };
    }
}

module.exports = OscBase;