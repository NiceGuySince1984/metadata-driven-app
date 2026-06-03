import { BrowserRouter, Routes, Route, Navigate, NavLink, useMatch } from 'react-router-dom';
import FormPage from './pages/FormPage';
import RecordsPage from './pages/RecordsPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import FormEditorPage from './pages/FormEditorPage';

function Nav() {
  const formMatch      = useMatch('/forms/:id');
  const recordsMatch   = useMatch('/forms/:id/records');
  const dashboardMatch = useMatch('/dashboards/:id');
  const adminMatch     = useMatch('/admin/*');
  const formId = formMatch?.params.id ?? recordsMatch?.params.id ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-display text-lg leading-none text-slate-900">MetaForm</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Form-scoped tabs */}
          {formId && (
            <nav className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm">
              <NavLink
                to={`/forms/${formId}`}
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 font-medium transition-colors ${
                    isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                Fill Form
              </NavLink>
              <NavLink
                to={`/forms/${formId}/records`}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                    isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
                Responses
              </NavLink>
            </nav>
          )}

          {/* Global nav */}
          <nav className="flex items-center gap-0.5 text-sm">
            <NavLink
              to="/forms/form_001"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              Forms
            </NavLink>
            <NavLink
              to="/dashboards/dash_001"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isActive || !!dashboardMatch ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isActive || !!adminMatch ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              Admin
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/forms/form_001" replace />} />
            <Route path="/forms/:id" element={<FormPage />} />
            <Route path="/forms/:id/records" element={<RecordsPage />} />
            <Route path="/dashboards/:id" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/forms/:id" element={<FormEditorPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
