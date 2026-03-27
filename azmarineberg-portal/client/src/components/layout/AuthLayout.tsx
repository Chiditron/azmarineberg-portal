import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="">
        {/* form */}
        <div className="h-screen min-h-[600px] overflow-y-auto bg-blue-50/30 flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-[500px] w-full">
            <div className="bg-white px-5 py-8 rounded-2xl shadow-sm border border-blue-100">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
