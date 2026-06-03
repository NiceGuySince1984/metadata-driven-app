import type { Application, Form, FullForm, Widget, Dashboard } from '@shared/types';

const BASE = '/api';

export async function getApplications(): Promise<Application[]> {
  const res = await fetch(`${BASE}/applications`);
  if (!res.ok) throw new Error(`Failed to fetch applications: ${res.status}`);
  return res.json();
}

export async function listForms(applicationId?: string): Promise<Form[]> {
  const url = applicationId
    ? `${BASE}/forms?applicationId=${encodeURIComponent(applicationId)}`
    : `${BASE}/forms`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch forms: ${res.status}`);
  return res.json();
}

export async function getForm(id: string): Promise<FullForm> {
  const res = await fetch(`${BASE}/forms/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Form not found: ${res.status}`);
  return res.json();
}

export async function listDashboards(applicationId?: string): Promise<Dashboard[]> {
  const url = applicationId
    ? `${BASE}/dashboards?applicationId=${encodeURIComponent(applicationId)}`
    : `${BASE}/dashboards`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch dashboards: ${res.status}`);
  return res.json();
}

export async function getDashboard(id: string): Promise<Dashboard> {
  const res = await fetch(`${BASE}/dashboards/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Dashboard not found: ${res.status}`);
  return res.json();
}

export async function getWidget(id: string): Promise<Widget> {
  const res = await fetch(`${BASE}/widgets/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Widget not found: ${res.status}`);
  return res.json();
}
