import { useState } from "react";
import { FiUser, FiMail, FiShield } from "react-icons/fi";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/common/PageHeader";

function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        description="Your account information and settings."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {user?.name || "User"}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <FiMail className="h-4 w-4" />
              {user?.email || "—"}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
              <FiShield className="h-3 w-3" />
              {user?.role || "user"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <div className="relative">
              <FiUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Email cannot be changed (backend constraint).
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Profile;
