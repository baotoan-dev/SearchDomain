const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const { Client } = require('@elastic/elasticsearch');
const cron = require('node-cron');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'students_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

const esClient = new Client({ node: 'http://localhost:9200' });

async function syncToElasticsearch() {
    try {
        const [rows] = await db.promise().query('SELECT * FROM students');

        for (const student of rows) {
            await esClient.index({
                index: 'students',
                id: student.id.toString(),
                body: student
            });
        }

        console.log('Data synchronized to Elasticsearch successfully.');
    } catch (error) {
        console.error('Error synchronizing data to Elasticsearch:', error);
    }
}

// 5 minutes call one time
cron.schedule('*/5 * * * *', () => {
    console.log('Running data sync...');
    // syncToElasticsearch();
});

app.post('/students', (req, res) => {
    const { name, email, age, grade } = req.body;
    db.query(
        'INSERT INTO students (name, email, age, grade) VALUES (?, ?, ?, ?)',
        [name, email, age, grade],
        async (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error adding student' });
            }

            const studentId = result.insertId;

            try {
                await esClient.index({
                    index: 'students',
                    id: studentId.toString(),
                    body: { id: studentId, name, email, age, grade }
                });
                console.log(`Student ${studentId} synced to Elasticsearch.`);
            } catch (error) {
                console.error('Error syncing student to Elasticsearch:', error);
                return res.status(500).json({ error: 'Error syncing student to Elasticsearch' });
            }

            res.status(201).json({ message: 'Student added successfully', studentId });
        }
    );
});

app.put('/students/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, age, grade } = req.body;

    db.query(
        'UPDATE students SET name = ?, email = ?, age = ?, grade = ? WHERE id = ?',
        [name, email, age, grade, id],
        async (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error updating student' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Student not found' });
            }

            try {
                await esClient.update({
                    index: 'students',
                    id: id.toString(),
                    body: {
                        doc: { name, email, age, grade }
                    }
                });
                console.log(`Student ${id} updated in Elasticsearch.`);
            } catch (error) {
                console.error('Error updating student in Elasticsearch:', error);
                return res.status(500).json({ error: 'Error updating student in Elasticsearch' });
            }

            res.json({ message: 'Student updated successfully' });
        }
    );
});


app.get('/students', async (req, res) => {
    try {
        const { body } = await esClient.search({
            index: 'students',
            body: {
                query: {
                    match_all: {}
                }
            }
        });

        res.json(body.hits.hits.map((hit) => hit._source));

    } catch (error) {
        console.log('Error fetching students from Elasticsearch:', error);
        return res.status(500).json({ error: 'Error fetching students' });
    }
});

app.get('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // elasticsearch
        const result = await esClient.search({
            index: 'students',
            body: {
                query: {
                    match: { id: id }
                }
            }
        });

        if (result.hits.total.value === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json(result.hits.hits[0]._source);
    } catch (error) {
        console.error('Error fetching student from Elasticsearch:', error);
        res.status(500).json({ error: 'Error fetching student' });
    }
});

app.get('/students/email/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const result = await esClient.search({
            index: 'students',
            body: {
                query: {
                    match: { email: email }
                }
            }
        });

        if (result.hits.total.value === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json(result.hits.hits[0]._source);
    } catch (error) {
        console.error('Error searching for student in Elasticsearch:', error);
        res.status(500).json({ error: 'Error searching for student' });
    }
});

app.delete('/students/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM students WHERE id = ?', [id], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error deleting student' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        try {
            await esClient.delete({
                index: 'students',
                id: id.toString()
            });
            console.log(`Student ${id} deleted from Elasticsearch.`);
        } catch (error) {
            console.error('Error deleting student from Elasticsearch:', error);
            return res.status(500).json({ error: 'Error deleting student from Elasticsearch' });
        }

        res.json({ message: 'Student deleted successfully' });
    });
});


app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
