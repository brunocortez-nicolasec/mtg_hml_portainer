// node-api/src/services/datasources/testDb.js

import pkg from 'pg';
const { Client } = pkg;

export const testDbConnection = async (req, res) => {
  const { host, port, user, password, database, type } = req.body;

  // Validação básica
  if (!host || !port || !user || !database) {
    return res.status(400).json({ message: "Faltam dados de conexão (Host, Porta, Usuário ou Banco)." });
  }

  // Por enquanto, vamos focar em PostgreSQL como solicitado
  if (type && type !== 'postgres' && type !== 'PostgreSQL') {
     return res.status(400).json({ message: "No momento, apenas conexões PostgreSQL são suportadas para teste." });
  }

  const client = new Client({
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    // ssl: { rejectUnauthorized: false } // Descomente se usar SSL (Azure/AWS)
    connectionTimeoutMillis: 5000, // Timeout de 5 segundos para não travar
  });

  try {
    await client.connect();
    
    // Faz uma query simples para garantir que temos permissão de leitura
    const result = await client.query('SELECT NOW() as now');
    
    await client.end();

    return res.status(200).json({ 
      message: "Conexão estabelecida com sucesso!", 
      serverTime: result.rows[0].now 
    });

  } catch (error) {
    console.error("Erro no teste de conexão DB:", error);
    try { await client.end(); } catch (e) {} // Tenta fechar se ficou aberta
    
    return res.status(500).json({ 
      message: `Falha ao conectar: ${error.message}` 
    });
  }
};