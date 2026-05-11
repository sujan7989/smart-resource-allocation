# Deployment Guide

Your code is on GitHub: **https://github.com/sujan7989/smart-resource-allocation**

## Backend → Render (Free Tier)

1. Go to **https://render.com** and sign in with GitHub
2. Click **New +** → **Web Service**
3. Connect your GitHub account and select `sujan7989/smart-resource-allocation`
4. Configure:
   - **Name:** `smart-resource-allocation-api`
   - **Region:** Singapore (or closest to you)
   - **Root Directory:** `backend`
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python seed_prod.py && uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

5. Add Environment Variables:
   - Click **Advanced** → **Add Environment Variable**
   - Add these:
     ```
     SECRET_KEY = any-random-string-abc123xyz
     FRONTEND_URL = https://your-frontend-url.vercel.app
     ```

6. Click **Create Web Service**

7. Render will automatically create a PostgreSQL database. Once created:
   - Go to your web service → **Environment**
   - Add `DATABASE_URL` → **Add from Database** → Select your PostgreSQL instance

8. Your API will be live at: `https://smart-resource-allocation-api.onrender.com`

---

## Frontend → Vercel (Free Tier)

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **Add New** → **Project**
3. Import `sujan7989/smart-resource-allocation`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Add Environment Variable:
   - Click **Environment Variables**
   - Add:
     ```
     VITE_API_URL = https://smart-resource-allocation-api.onrender.com/api
     ```
   (Replace with your actual Render backend URL)

6. Click **Deploy**

7. Your app will be live at: `https://smart-resource-allocation-xyz.vercel.app`

---

## Update Backend with Frontend URL

Once your Vercel deployment is live:

1. Go back to Render → Your web service → **Environment**
2. Update `FRONTEND_URL` to your actual Vercel URL
3. Save (this will trigger a redeploy)

---

## Test the Deployment

1. Visit your Vercel URL
2. Login with demo account:
   - **Email:** `admin@smartalloc.org`
   - **Password:** `Admin@123`

3. You should see the dashboard with demo data!

---

## Alternative: Deploy with CLI

### Vercel CLI

```bash
cd frontend
npx vercel login
npx vercel --prod
# Follow prompts, set VITE_API_URL when asked
```

### Render CLI

Render doesn't have a CLI — use the web dashboard or `render.yaml` (already configured).

---

## Troubleshooting

**Backend not starting?**
- Check Render logs for errors
- Ensure `DATABASE_URL` is set correctly
- Verify Python version is 3.11

**Frontend can't connect to backend?**
- Check `VITE_API_URL` is set correctly in Vercel
- Ensure backend CORS allows your frontend URL
- Check browser console for errors

**Database empty?**
- `seed_prod.py` runs automatically on first deploy
- Check Render logs to confirm it ran
- If needed, manually run: `python seed_prod.py` in Render shell

---

## Local Development

Already running on your machine:
- **Backend:** http://localhost:8000 (API docs at /docs)
- **Frontend:** http://localhost:5173

To stop servers:
```bash
# Stop backend
Ctrl+C in backend terminal

# Stop frontend
Ctrl+C in frontend terminal
```

To restart:
```bash
# Backend
cd backend
.\venv\Scripts\activate
uvicorn src.main:app --reload

# Frontend
cd frontend
npm run dev
```
