import axios from "axios";

const API = axios.create({
    baseURL: 'https://pybattle-backend.onrender.com',
});

export default API;
