How to Run CircuitGen AI

If you want to try out this project on your own machine, follow these simple steps.

Prerequisites

Node.js: Make sure you have Node installed. Download Here.

Gemini API Key: You need a free API key from Google. Get it here.

Quick Start

Clone the Repository

git clone [https://github.com/Shanky085/circuitgen-ai.git](https://github.com/Shanky085/circuitgen-ai.git)
cd circuitgen-ai


Install Dependencies

npm install


Configure API Key

Create a new file in the root folder named .env

Add the following line to it (replace with your actual key):

REACT_APP_GEMINI_API_KEY=AIzaSy...YourKeyHere...


Run the App

npm start


The app will open at http://localhost:3000.

Features to Try

Theme Switcher: Click the icons in the top right to switch between Light, Dark, and Blueprint modes.

AI Generation: Type "Full Adder" or "2-bit Multiplier" in the search bar and click Load.

Simulation: Click the blue/white switches on the breadboard to toggle inputs and watch the LEDs change.