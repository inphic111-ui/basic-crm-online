import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const PRIORITY_OPTIONS = [
  "S級-確認待收款",
  "A級-優質跟進客戶",
  "B級-跟進客戶",
  "C級-養成客戶",
  "D級-低價值無效客戶",
  "E級-永久無需求",
  "聯繫名單失效",
  "客戶要求拒絕往來",
  "黑名單",
];

const CLASSIFICATION_OPTIONS = ["鯨魚", "鯊魚", "小魚", "小蝦"];

export default function Customers() {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    priority: "B級-跟進客戶",
    classification: "小魚",
    notes: "",
  });

  const { data: listData, isLoading, refetch } = trpc.customers.list.useQuery({ page, limit: 10 });
  const createMutation = trpc.customers.create.useMutation();
  const updateMutation = trpc.customers.update.useMutation();
  const deleteMutation = trpc.customers.delete.useMutation();
  const seedMutation = trpc.customers.seed.useMutation();

  const handleAddCustomer = async () => {
    if (!formData.name.trim()) {
      alert("請輸入客戶名稱");
      return;
    }

    try {
      await createMutation.mutateAsync({ name: formData.name, email: formData.email || undefined, phone: formData.phone || undefined, company: formData.company || undefined, priority: formData.priority as any, classification: formData.classification as any, notes: formData.notes || undefined });
      alert("客戶已新增");
      setFormData({ name: "", email: "", phone: "", company: "", priority: "B級-跟進客戶", classification: "小魚", notes: "" });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      alert("新增客戶失敗");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!formData.name.trim()) {
      alert("請輸入客戶名稱");
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: editingCustomer.id, name: formData.name, email: formData.email || undefined, phone: formData.phone || undefined, company: formData.company || undefined, priority: formData.priority as any, classification: formData.classification as any, notes: formData.notes || undefined });
      alert("客戶已更新");
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      refetch();
    } catch (error) {
      alert("更新客戶失敗");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("確定要刪除此客戶嗎？")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      alert("客戶已刪除");
      refetch();
    } catch (error) {
      alert("刪除客戶失敗");
    }
  };

  const handleSeedCustomers = async () => {
    try {
      await seedMutation.mutateAsync();
      alert("已種植 5 個預設客戶");
      refetch();
    } catch (error) {
      alert("種植客戶失敗");
    }
  };

  const openEditDialog = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      priority: customer.priority || "B級-跟進客戶",
      classification: customer.classification || "小魚",
      notes: customer.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">需要登入</h2>
          <p className="text-gray-600">請登入以查看和管理客戶資料</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">客戶管理</h1>
          <div className="flex gap-2">
            {isAuthenticated && (
              <>
                <Button onClick={handleSeedCustomers} variant="outline" disabled={seedMutation.isPending}>
                  {seedMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  種植預設客戶
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      新增客戶
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增客戶</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">客戶名稱 *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="輸入客戶名稱"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">電郵</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="輸入電郵"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">電話</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="輸入電話"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">公司</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="輸入公司名稱"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priority">優先級</Label>
                        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="classification">分類</Label>
                        <Select value={formData.classification} onValueChange={(value) => setFormData({ ...formData, classification: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CLASSIFICATION_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="notes">備註</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="輸入備註"
                        />
                      </div>
                      <Button onClick={handleAddCustomer} disabled={createMutation.isPending} className="w-full">
                        {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        新增
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-8">
              {listData?.customers && listData.customers.length > 0 ? (
                listData.customers.map((customer: any) => (
                  <Card key={customer.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{customer.name}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          {customer.email && <p>📧 {customer.email}</p>}
                          {customer.phone && <p>📱 {customer.phone}</p>}
                          {customer.company && <p>🏢 {customer.company}</p>}
                          <p>⭐ {customer.priority}</p>
                          <p>🐋 {customer.classification}</p>
                        </div>
                        {customer.notes && <p className="mt-2 text-sm text-gray-700">📝 {customer.notes}</p>}
                      </div>
                      {isAuthenticated && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center text-gray-500">
                  <p>暫無客戶資料</p>
                </Card>
              )}
            </div>

            {listData && listData.pages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  首頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  第 {page} / {listData.pages} 頁
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === listData.pages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(listData.pages)}
                  disabled={page === listData.pages}
                >
                  末頁
                </Button>
              </div>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯客戶</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">客戶名稱 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="輸入客戶名稱"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">電郵</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="輸入電郵"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">電話</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="輸入電話"
                />
              </div>
              <div>
                <Label htmlFor="edit-company">公司</Label>
                <Input
                  id="edit-company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="輸入公司名稱"
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">優先級</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-classification">分類</Label>
                <Select value={formData.classification} onValueChange={(value) => setFormData({ ...formData, classification: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-notes">備註</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="輸入備註"
                />
              </div>
              <Button onClick={handleUpdateCustomer} disabled={updateMutation.isPending} className="w-full">
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                更新
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
