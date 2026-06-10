const appJson = require("./app.json");

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo?.extra ?? {}),
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://proestoque-api-production.up.railway.app/api",
      eas: {
        ...(appJson.expo?.extra?.eas ?? {}),
        projectId: "e389d585-73be-4003-b2db-e9dcea0ad510",
      },
    },
  },
};