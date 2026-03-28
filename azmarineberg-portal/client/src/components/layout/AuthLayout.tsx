import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="">
        {/* form */}
        <div className="h-screen min-h-[600px] overflow-y-auto bg-blue-50/30 flex items-center justify-center py-6 wrap sm:p-12">
          <div className="max-w-[500px] w-full">
            <div className="flex items-center justify-center mb-6 gap-2">
              <div>
                <img src="/logo.png" alt="az logo" className="w-10 h-10 md:w-12 md:h-12 object-cover" />
              </div>
              <span className="font-bold text-gray-900 text-xl md:text-2xl tracking-tight font-outfit">
                Azmarineberg
              </span>
            </div>
            <div className="bg-white px-5 py-8 rounded-2xl shadow-sm border border-blue-100">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
