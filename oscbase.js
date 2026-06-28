const fs = require('fs');
const path = require('path');

class OscBase {
    constructor(dbFolder = 'database_store') {
        this.dbFolder = path.resolve(process.cwd(), dbFolder);
        this.collections = new Map();
        this.init();
    }

    init() {
        try {
            if (!fs.existsSync(this.dbFolder)) {
                fs.mkdirSync(this.dbFolder, { recursive: true });
            }
            const uploadsDir = path.join(this.dbFolder, 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const files = fs.readdirSync(this.dbFolder);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const collectionName = file.replace('.json', '');
                    const content = fs.readFileSync(path.join(this.dbFolder, file), 'utf-8');
                    try {
                        this.collections.set(collectionName, JSON.parse(content || '{}'));
                    } catch (e) {
                        this.collections.set(collectionName, {});
                    }
                }
            }
            console.log(`🔄 OscBase active. Hydrated ${this.collections.size} collections.`);
        } catch (err) {
            console.error("Critical directory layout failures:", err);
        }
    }

    set(collection, key, value) {
        try {
            if (!this.collections.has(collection)) {
                this.collections.set(collection, {});
            }
            const data = this.collections.get(collection);
            data[key] = value;

            fs.writeFileSync(
                path.join(this.dbFolder, `${collection}.json`),
                JSON.stringify(data, null, 2),
                'utf-8'
            );
            return { success: true, key };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    get(collection, key) {
        if (this.collections.has(collection)) {
            const data = this.collections.get(collection);
            if (data[key] !== undefined) {
                return { success: true, key, value: data[key] };
            }
        }
        return { success: false, error: "Key missing." };
    }
}

module.exports = OscBase;