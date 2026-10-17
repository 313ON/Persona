import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import ThemeToggle from '@/app/ThemeToggle';
import ReportsFilters from './ReportsFilters';
export const dynamic='force-dynamic';
export default async function Reports(){const user=await currentUser();if(!user)redirect('/login');if(!['SUPER_ADMIN','HR_MANAGER','AUDITOR'].includes(user.role))redirect('/');const units=await db.organizationalUnit.findMany({select:{id:true,name:true},orderBy:{name:'asc'}});return <main className="app-shell"><header className="topbar"><a className="brand-lockup" href="/"><span className="brand-mark">چ</span><span><strong>Persona</strong><small>سامانه منابع انسانی چرب شیمی</small></span></a><nav><a href="/">داشبورد</a><a href="/employees">دفتر پرسنل</a><a className="active" href="/reports">گزارش‌ها</a></nav><div className="account-area"><ThemeToggle/><span className="session-badge">{user.role==='SUPER_ADMIN'?'مدیر ارشد':'منابع انسانی'}</span></div></header><div className="page-heading"><div><p className="eyebrow">منابع انسانی / گزارش‌ها</p><h1>گزارش کارکنان</h1><p className="muted">گزارش را فیلتر کنید، نتیجه را بررسی کنید و همان مجموعه را دریافت کنید.</p></div></div><ReportsFilters units={units}/></main>}
