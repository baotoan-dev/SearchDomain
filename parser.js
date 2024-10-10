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

        const sheetName = workbook.SheetNames[3];

        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const jsonFilePath = path.join(__dirname, 'data', 'dantoc.json');

        // remove 2 item first
        jsonData.shift();
        jsonData.shift();

        // modify column "DANH MỤC DÂN TỘC" -> "STT" , "__EMPTY" -> "code", "__EMPTY_1" -> "name", "__EMPTY_2" -> "orther_name"
        jsonData.forEach((item) => {
            item['sort_order'] = item['DANH MỤC DÂN TỘC'];
            item['code'] = item['__EMPTY'];
            item['name'] = item['__EMPTY_1'];
            item['orther_name'] = item['__EMPTY_2'];

            delete item['DANH MỤC DÂN TỘC'];
            delete item['__EMPTY'];
            delete item['__EMPTY_1'];
            delete item['__EMPTY_2'];
        });

        jsonData.map((item) => {
            // item['sort_order'] = item['sort_order'] - 1;
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
