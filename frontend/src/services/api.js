// ============================================================
// api.js — All backend API calls in one place
// ============================================================

import axios from 'axios'

// Base URL for backend
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,   // 60s timeout (Groq can be slow sometimes)
})


// ============================================================
// GENERATE GRAPH
// ============================================================
export async function generateGraph(question) {
  const response = await api.post('/generate-graph', { question })
  return response.data
}


// ============================================================
// HISTORY — Get all saved graphs
// ============================================================
export async function getHistory(limit = 20, offset = 0) {
  const response = await api.get('/api/history', {
    params: { limit, offset },
  })
  return response.data
}


// ============================================================
// GET SINGLE GRAPH BY ID
// ============================================================
export async function getGraphById(id) {
  const response = await api.get(`/api/graphs/${id}`)
  return response.data
}


// ============================================================
// DELETE GRAPH
// ============================================================
export async function deleteGraph(id) {
  const response = await api.delete(`/api/graphs/${id}`)
  return response.data
}

// ============================================================
// TOUCH GRAPH — Update created_at (moves to top of history)
// SAFE: Only updates timestamp, no duplicates
// ============================================================
export async function touchGraph(id) {
  const response = await api.post(`/api/graphs/${id}/touch`)
  return response.data
}

export default api