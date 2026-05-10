import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Users, CarFront, FileText, Receipt, LogOut } from "lucide-react";

const navItems = [
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/vehicles", label: "Vehicles", icon: CarFront },
  { path: "/estimates", label: "Estimates", icon: FileText },
  { path: "/invoices", label: "Invoices", icon: Receipt },
];

function Navbar({ onLogout }) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mr-auto">
          <span className="font-bold text-lg tracking-tight">GARAGE ERP</span>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
