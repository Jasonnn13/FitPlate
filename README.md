# FitPlate

**A Fully Functional Calorie Tracker and Health Recipe web app**

FitPlate is a modern web application designed to help users track their daily calorie intake and discover healthy recipes, empowering them to achieve their nutritional goals.

---

## Features

- Track calories and nutrition for daily meals
- Discover and save healthy recipes
- User-friendly dashboard and analytics
- Built with Next.js (frontend) and Flask (backend API)
- Authentication and user management

---

## Tech Stack

- **Frontend:** Next.js (TypeScript, CSS)
- **Backend API:** Flask (Python)
- **Other:** JavaScript

---

## Getting Started

To run FitPlate locally, you'll need to start both the Flask backend and the Next.js frontend.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.8+ recommended)
- [pip](https://pip.pypa.io/en/stable/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Jasonnn13/FitPlate.git
cd FitPlate
```

---

### 2. Running the Flask Backend

1. **Navigate to the backend directory**  
   (Assuming your Flask API is in `backend/` or a similar folder. Adjust as needed.)

   ```bash
   cd backend
   ```

2. **Create & activate a virtual environment (recommended)**

   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask server**

   ```bash
   flask run
   ```

   The API will usually run at `http://127.0.0.1:5000/`.

---

### 3. Running the Next.js Frontend

1. **Navigate to the frontend directory**  
   (Assuming your Next.js app is in `frontend/` or a similar folder. Adjust as needed.)

   ```bash
   cd ../frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**  
   Create a `.env.local` file and set the backend API URL:

   ```
   NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
   ```

4. **Run the Next.js development server**

   ```bash
   npm run dev
   ```

   The frontend will usually run at `http://localhost:3000/`.

---

## Usage

- Open `http://localhost:3000` in your browser.
- Register or log in to start tracking calories and exploring recipes.
- Ensure the Flask backend is running before using the app.

---

## Project Structure

```
FitPlate/
├── backend/       # Flask (Python) API
│   ├── app.py
│   ├── requirements.txt
│   └── ...
├── frontend/      # Next.js (TypeScript) frontend
│   ├── package.json
│   ├── pages/
│   └── ...
└── README.md
```

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)

---
