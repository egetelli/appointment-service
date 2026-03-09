const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EuroFlow Randevu Sistemi API", // Proje adın
      version: "1.0.0",
      description:
        "Angular Frontend ve C# Backend entegrasyonu için geliştirilmiş Randevu Servisi dokümantasyonu.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Geliştirme Sunucusu",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Dokümante edilecek dosyaların yolları
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
