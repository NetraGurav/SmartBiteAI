# SmartBite AI 🍎

A comprehensive web application designed to help users manage their food inventory, reduce waste, and make healthier dietary choices. SmartBite AI combines expiry tracking, nutrition analysis, health risk assessment, and smart recommendations in one intelligent platform.

## 🚀 Features

### Core Features (Implemented)
- ✅ User authentication (register, login, logout)
- ✅ JWT-based secure authentication
- ✅ User profile management
- ✅ Responsive modern UI with Tailwind CSS
- ✅ Protected routes and navigation

### Planned Features
- 🔄 Food item management (CRUD operations)
- 🔄 Barcode/QR code scanning
- 🔄 OCR for expiry date extraction
- 🔄 Nutrition information integration
- 🔄 Health risk analysis
- 🔄 Smart recommendations
- 🔄 Multi-channel notifications (Email, SMS, WhatsApp)
- 🔄 Reports and analytics
- 🔄 PWA support

## 🛠️ Technology Stack

### Frontend
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SmartBiteAI
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env file with your configuration
# Update JWT_SECRET and MONGO_URI as needed

# Start the server
npm start
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will run on `http://localhost:3000`

### 4. Database Setup

Make sure MongoDB is running on your system. The application will automatically create the database and collections when you first register a user.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://127.0.0.1:27017/smartbiteai

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Keys (to be added later)
# EDAMAM_API_KEY=your-edamam-api-key
# SPOONACULAR_API_KEY=your-spoonacular-api-key
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

## 📁 Project Structure

```
SmartBiteAI/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── App.js          # Main app component
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Node.js backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── index.js            # Server entry point
│   ├── package.json
│   └── env.example
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### Food Management (Coming Soon)
- `GET /api/foods` - Get all food items
- `POST /api/foods` - Add new food item
- `GET /api/foods/:id` - Get specific food item
- `PUT /api/foods/:id` - Update food item
- `DELETE /api/foods/:id` - Delete food item

## 🎨 UI Components

The application uses a modern, responsive design with:

- **Clean, minimalist interface**
- **Mobile-first responsive design**
- **Accessible components**
- **Loading states and error handling**
- **Toast notifications**
- **Gradient backgrounds and modern styling**

## 🔒 Security Features

- **JWT-based authentication**
- **Password hashing with bcrypt**
- **Protected API routes**
- **Input validation**
- **CORS configuration**
- **Environment variable protection**

## 🚧 Development Status

### Phase 1: ✅ Complete
- Basic project setup
- User authentication system
- Frontend routing and navigation
- Basic UI components

### Phase 2: 🔄 In Progress
- Food item management
- Database models and API endpoints
- Basic CRUD operations

### Phase 3: 📋 Planned
- Barcode/QR scanning
- OCR integration
- Nutrition API integration
- Health risk analysis

### Phase 4: 📋 Planned
- Smart recommendations
- Notification system
- Reports and analytics
- PWA features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- MongoDB team for the flexible database
- All contributors and supporters

## 📞 Support

If you have any questions or need help, please:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Made with ❤️ for better food management and healthier living!** 