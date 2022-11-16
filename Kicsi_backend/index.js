const app = require('express')();
const cors = require('cors');
const bodyParser = require('body-parser')
const mysql = require('mysql');
const PORT = 8080;

app.use(bodyParser.json());
app.use(cors());

// mivel a database műveletek async-ek, ezért csinálunk egy method-öt neki, és csak akkor megyünk tovább, ha sikerült
// különben console-ban hibát írunk ki
setupDb().then(err => {
    if (typeof err !== "undefined") {
       console.error("Adatbázis hiba!");
       console.error(err);
       return;
    }
    // C
    app.post('/tasks/create', (req, res) => {
        // először megnézzük, hogy küldted-e task nevet, vagy üres szöveget küldött
        if (typeof req.body.name === "undefined" || req.body.name.trim() === "") {
            // nem küldött, hibát adunk vissza
            res.status(400).send({
                error: "Missing name."
            });
            return;
        }
        // itt adjuk be a taskot a db-nek
        execute(mysql.format(`INSERT INTO tasks (name) VALUES (?)`, [req.body.name])).then(() => {
            // ha sikerült az insert-elés, akkor visszaadunk 200-as status code-ot
            res.status(200).send({});
        }).catch(err => {
            // ha nem sikerült, akkor visszaadjuk a hibát
            res.status(500).send({
                error: "Database error",
                details: err
            });
        });
    });
    // R
    app.get('/tasks/get', (req, res) =>  {
        // lekérjük az összes adatot a táblából, majd simán visszaadjuk JSON-ként
        execute("SELECT * FROM tasks").then(result => {
            res.status(200).send(result);
        }).catch(err => {
            // hibát kaptunk, ezért nem lenne jó 200-at visszaküldeni
            res.status(500).send({
                error: "Database error",
                details: err
            });
        });
    });
    // U
    app.put('/tasks/update', (req, res) => {
       // először megnézzük, hogy küldted-e task id-t (ami kötelező az update-hez, és hozzá optional value-okat)
       if (typeof req.body.id === "undefined" || req.body.id.trim() === "" || isNaN(parseInt(req.body.id))) {
           // nem küldött, hibát adunk vissza
           res.status(400).send({
               error: "Missing id."
           });
           return;
       }
       let name = null;
       let status = null;
       if (typeof req.body.name !== 'undefined' && req.body.name.trim() !== "") {
           name = req.body.name;
       }
       // megnézzük, hogy
       // - küldött-e statust
       // - az a status üres-e
       // - és szám-e (NaN => not a number)
       if (typeof req.body.status !== 'undefined' && req.body.status.trim() !== "" && !isNaN(parseInt(req.body.status))) {
           status = parseInt(req.body.status);
           // ha nagyobb, mint 2, akkor nem insert-eljük
           // mert 0: to do
           // 1: in progress
           // 2: done
           if (status > 2) status = null;
       }

       if (name !== null || status !== null) {
           // build-eljük az SQL-t a name és status-sal
           // de mivel opcionális, ezért meg kell néznünk, hogy null-e
           // lehet lambdával rövidíteni, like UPDATE tasks SET ${name ? ' name = ' + name : ''}, de nem "szép"
           // legalább is az, de így átláthatóbb
           let sql = "UPDATE tasks SET";
           if (name !== null) {
               sql += mysql.format(` name = ?`, [name]);
           }
           if (status !== null) {
               if (name !== null){
                   sql += ", ";
               }
               sql += mysql.format(` status = ?`, [status]);
           }
           sql += mysql.format(` WHERE id = ?`, [parseInt(req.body.id)]);
           execute(sql).then(() => {
               // ha sikerült, akkor 200 status code
               res.status(200).send();
           }).catch(err => {
               // ha nem sikerült, visszaadjuk az error message-et
               res.status(500).send({
                   error: "Database error",
                   details: err
               });
           });
       }
       else {
           // semmi adatot nem adott meg update-nek, szóval we let them know, hogy nem adtak át valid adatot
           res.status(400).send({
               error: "Missing name OR status."
           });
       }
    });
    // D
    app.delete('/tasks/delete/:id', (req, res) => {
        // megnézzük, hogy van-e ID megadva
        if (typeof req.params.id === 'undefined' || isNaN(parseInt(req.params.id))) {
            res.status(400).send({
                error: "Missing id."
            });
            return;
        }
        // töröljük az adott ID-nél
        execute(mysql.format("DELETE FROM tasks WHERE id = ?", [parseInt(req.params.id)])).then(() => {
            res.status(200).send({});
        }).catch(err => {
            res.status(500).send({
                error: "Database error",
                details: err
            });
        });
    });

    // elindítjuk az Express-t
    app.listen(PORT, () =>
        console.log(`RESTful API is alive on http://localhost:${PORT}`));
});



function setupDb() {
    return new Promise((resolve) => {
        // először, hogy biztosra menjünk, ensure-oljuk a táblát
        execute("CREATE TABLE IF NOT EXISTS tasks (id INT AUTO_INCREMENT NOT NULL PRIMARY KEY, " +
            "name VARCHAR(255) NOT NULL, status TINYINT DEFAULT 0);").then(() => resolve()).catch(resolve);

        // nem kell más adatbázis művelet, mehetünk tovább
        // mivel csak betöltésről van szó most
    });
}
// adatbázis kapcsolódás és SQL végrehajtás
function execute(sql) {
    return new Promise((resolve, reject) => {
        // létrehozunk egy connection-t
        const con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "mysql",
            database: "progmod2_kicsi"
        });
        // megpróbálunk csatlakozni
        con.connect(function(err) {
            // ha van hiba, akkor visszaküldjük a hibát
            if (err) {
                reject(err);
                return;
            }

            // végrehajtjuk a query-t
            con.query(sql, function (err, result) {
                // ha van hiba, akkor visszaküldjük a hibát
                if (err) {
                    reject(err);
                    return;
                }
                // különben visszaküldjük az eredményt
                resolve(result);
            });
        });
    });

}