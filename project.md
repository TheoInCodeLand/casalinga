casalinga-tours/
├── .env
├── .env.example
├── .gitignore
├── app.js
├── package.json
├── package-lock.json
├── README.md
├── setup.sh
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   ├── images/
│   └── uploads/
│
├── views/
│   ├── layout.ejs
│   ├── index.ejs
│   ├── about.ejs
│   ├── contact.ejs
│   │
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── navbar.ejs
│   │   ├── footer.ejs
│   │   └── messages.ejs
│   │
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   │
│   ├── tours/
│   │   ├── index.ejs
│   │   └── show.ejs
│   │
│   ├── bookings/
│   │   └── new.ejs
│   │
│   ├── admin/
│   │   ├── dashboard.ejs
│   │   ├── tours/
│   │   │   ├── index.ejs
│   │   │   ├── new.ejs
│   │   │   └── edit.ejs
│   │   ├── bookings/
│   │   │   └── index.ejs
│   │   └── users/
│   │       └── index.ejs
│   │
│   ├── users/
│   │   ├── dashboard.ejs
│   │   └── profile.ejs
│   │
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
│
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── tours.js
│   ├── bookings.js
│   ├── admin.js
│   └── users.js
│
├── models/
│   ├── User.js
│   ├── Tour.js
│   └── Booking.js
│
├── middlewares/
│   └── auth.js
│
├── config/
│   └── database.js
│
└── database/
    ├── schemas/
    │   └── init.sql
    └── db-init.js