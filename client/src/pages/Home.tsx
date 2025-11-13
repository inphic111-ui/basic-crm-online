import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">{APP_TITLE}</h1>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700">{user?.name || "用戶"}</span>
                <Button variant="outline" onClick={logout}>
                  登出
                </Button>
              </>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()}>
                登入
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            歡迎使用音檔管理系統
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            上傳、轉錄和分析您的音檔文件，使用 AI 技術提供智能分析
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎙️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">音檔上傳</h3>
            <p className="text-gray-600">
              支持多種音檔格式，快速上傳您的音檔文件
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">自動轉錄</h3>
            <p className="text-gray-600">
              使用 AI 技術自動將音檔轉換為文本
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">智能分析</h3>
            <p className="text-gray-600">
              AI 分析轉錄文本，提供摘要和關鍵詞提取
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="text-center">
            <Link href="/audio">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 text-lg rounded-lg font-semibold">
                開始使用
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
