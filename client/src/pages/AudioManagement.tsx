import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Music, FileAudio } from "lucide-react";
import { toast } from "sonner";

export default function AudioManagement() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 查詢用戶的音檔列表
  const { data: recordings, isLoading, refetch } = trpc.recordings.list.useQuery();

  // 創建音檔記錄的 mutation
  const createRecordingMutation = trpc.recordings.create.useMutation({
    onSuccess: () => {
      toast.success("音檔上傳成功");
      setUploadedFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`上傳失敗: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error("請選擇一個音檔文件");
      return;
    }

    setIsUploading(true);
    try {
      // 這裡應該上傳到 R2，然後創建記錄
      // 目前先創建一個本地記錄
      await createRecordingMutation.mutateAsync({
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        filePath: `uploads/${Date.now()}-${uploadedFile.name}`,
        duration: 0, // 應該從音檔元數據獲取
      });
    } catch (error) {
      console.error("上傳錯誤:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Music className="w-10 h-10 text-indigo-600" />
            音檔管理系統
          </h1>
          <p className="text-gray-600 mt-2">上傳、轉錄和分析您的音檔文件</p>
        </div>

        {/* 上傳區域 */}
        <Card className="bg-white shadow-lg mb-8 p-8">
          <div className="flex flex-col gap-6">
            <div className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
              <FileAudio className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">上傳音檔</h3>
              <p className="text-gray-600 mb-4">支持 MP3、WAV、M4A 等格式</p>
              <Input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
                id="audio-input"
              />
              <label htmlFor="audio-input" className="cursor-pointer">
                <Button
                  variant="outline"
                  className="mb-2"
                  onClick={() => document.getElementById("audio-input")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  選擇文件
                </Button>
              </label>
              {uploadedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  已選擇: {uploadedFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!uploadedFile || isUploading || createRecordingMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold"
            >
              {isUploading || createRecordingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  上傳中...
                </>
              ) : (
                "上傳並轉錄"
              )}
            </Button>
          </div>
        </Card>

        {/* 音檔列表 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">我的音檔</h2>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : recordings && recordings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordings.map((recording) => (
                <Card key={recording.id} className="bg-white shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <FileAudio className="w-8 h-8 text-indigo-500 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {recording.fileName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        大小: {(recording.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-sm text-gray-600">
                        時長: {recording.duration ? `${recording.duration}s` : "未知"}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          recording.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : recording.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {recording.status === "pending" ? "待處理" : 
                           recording.status === "transcribing" ? "轉錄中" :
                           recording.status === "completed" ? "已完成" : "失敗"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white shadow-md p-12 text-center">
              <FileAudio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">還沒有上傳任何音檔</p>
              <p className="text-gray-500 text-sm mt-2">上傳您的第一個音檔開始使用</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
