const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();

app.use(express.json());

app.get('/parser', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'mau-up-csdl-hocsinh.xls');

    try {
        const fileBuffer = fs.readFileSync(filePath);

        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[9];

        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const jsonFilePath = path.join(__dirname, 'data', 'countries.json');

        console.log(jsonData);

        // remove 2 item first
        jsonData.shift();
        jsonData.shift();

        // modify column "DANH MỤC QUỐC TICH" -> "sort_order" , "__EMPTY" -> "code", "__EMPTY_1" -> "name"
        jsonData.forEach((item) => {
            item['sort_order'] = item['DANH MỤC QUỐC TICH'];
            item['code'] = item['__EMPTY'];
            item['name'] = item['__EMPTY_1'];

            delete item['DANH MỤC QUỐC TICH'];
            delete item['__EMPTY'];
            delete item['__EMPTY_1'];
        });

        jsonData.map((item) => {
            item['sort_order'] = parseInt(item['sort_order']) - 1;
            item['is_active'] = true;
            item['code'] = item['code'].toString();
        });


        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData));

        res.json(jsonData);
    } catch (error) {
        res.status(500).json({ error: 'Error reading Excel file' });
    }
});

app.listen(8888, () => {
    console.log('Server is running on port 8888');
});
