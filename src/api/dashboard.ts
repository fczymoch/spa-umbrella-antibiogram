import { apiClient } from './client'
import type { DashboardResponse, DashboardExamStats, DashboardRecentExam } from '../types'

/** GET /v1/dashboard/stats — totais e contagem por status para o gráfico */
export async function getDashboardStats(): Promise<DashboardExamStats> {
  const { data } = await apiClient.get<DashboardExamStats>('/dashboard/stats')
  return data
}

/** GET /v1/dashboard/recent — últimos exames finalizados para a tabela */
export async function getDashboardRecent(): Promise<DashboardRecentExam[]> {
  const { data } = await apiClient.get<DashboardRecentExam[]>('/dashboard/recent')
  return data
}

/** @deprecated Use getDashboardStats + getDashboardRecent */
export async function getDashboard(): Promise<DashboardResponse> {
  const { data } = await apiClient.get<DashboardResponse>('/dashboard')
  return data
}
