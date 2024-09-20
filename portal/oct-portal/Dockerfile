# Use a Node.js image to build the app
FROM node:14

# Set the working directory
WORKDIR /app

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app for production
RUN npm run build

# Expose the React app port (3000)
EXPOSE 3000

# Serve the app
CMD ["npm", "start"]