import sql from 'mssql';

const config = {
    user: 'mti.hr',
    password: 'Merdeka@2025!',
    server: '10.60.10.47',
    database: 'MTIMasterEmployeeDB',
    options: {
        trustedConnection: true,
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
    })
    .catch(err => console.log('Database Connection Failed! ', err));

export { sql, poolPromise };