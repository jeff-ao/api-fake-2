const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite", // Caminho do arquivo do banco
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Testa a conexão
sequelize
  .authenticate()
  .then(() => {
    console.log("Conexão SQLite estabelecida com sucesso.");
  })
  .catch((err) => {
    console.error("Não foi possível conectar ao SQLite:", err);
    process.exit(1);
  });

module.exports = sequelize;
