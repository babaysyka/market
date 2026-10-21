import { AccountNav } from "@/components/account-nav";
import { AccountGate } from "@/components/account-access";
import { Breadcrumbs } from "@/components/catalog-tools";
import { SettingsForm } from "@/components/store-forms";

export default function AccountSettingsPage() {
  return <AccountGate><main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Личный кабинет", href: "/account/profile" }, { label: "Настройки" }]} />
    <div className="page-title-row"><div><h1>Настройки профиля</h1><p>Контактные данные и безопасность аккаунта.</p></div></div>
    <div className="account-layout"><AccountNav active="/account/settings" /><section className="content-panel"><h2>Личные данные</h2><SettingsForm /></section></div>
  </main></AccountGate>;
}
