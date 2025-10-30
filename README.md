
# Óptica La Fina — App simple (Node + Express + LowDB)

**Accesos**
- Usuario: entra sin contraseña (botón "Entrar como Usuario")
- Administrador: contraseña `lafina123325` (o cambia con variable de entorno `ADMIN_PASSWORD`)

## Ejecutar en tu PC
1. Instalar Node 18+
2. Abrir este folder en la terminal y ejecutar:
   ```bash
   npm install
   npm start
   ```
3. Abrí http://localhost:3000

> Los datos se guardan en `db.json` (archivo local). Si reinstalás o borrás el archivo, se pierde.

## Subir a Render.com (una sola app)
1. Crea un nuevo **Web Service** en Render y subí este ZIP o conectá un repo con estos archivos.
2. **Comando de compilación**: (vacío)
3. **Comando de inicio**: `node server.js`
4. Entorno: Node 18+
5. (Opcional) `ADMIN_PASSWORD` en Variables de Entorno.
