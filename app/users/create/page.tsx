"use client";

import { UserRegistrationForm } from "@/components/users/user-registration-form";

export default function CreateUserPage() {
  return (
    <div className="min-h-screen bg-[#001122] p-6">
      <div className="max-w-6xl mx-auto">
        <UserRegistrationForm />
      </div>
    </div>
  );
}

