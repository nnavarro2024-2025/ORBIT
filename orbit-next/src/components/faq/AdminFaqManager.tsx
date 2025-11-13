"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Faq } from "@shared/schema";
import { FAQ_CATEGORIES } from "@/shared/faq";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SkeletonTableRows } from "@/components/ui/skeleton-presets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const ALL_CATEGORIES_OPTION = "All";
const INITIAL_CATEGORY = FAQ_CATEGORIES[0];

type FaqFormState = {
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
};

const DEFAULT_FORM: FaqFormState = {
  category: INITIAL_CATEGORY,
  question: "",
  answer: "",
  sortOrder: 0,
};

function normalizeSortOrder(faqs: Faq[]): number {
  if (!faqs.length) return 0;
  const max = Math.max(...faqs.map((item) => item.sortOrder ?? 0));
  return Number.isFinite(max) ? max + 10 : 10;
}

export default function AdminFaqManager({ searchTerm: externalSearchTerm }: { searchTerm?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_OPTION);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formState, setFormState] = useState<FaqFormState>(DEFAULT_FORM);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [faqToDelete, setFaqToDelete] = useState<Faq | null>(null);

  const { data: faqs = [], isLoading, isError, refetch, isFetching } = useQuery<Faq[]>({
    queryKey: ["faqs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/faqs");
      const payload = await res.json();
      return Array.isArray(payload?.data) ? payload.data : [];
    },
  });

  const invalidateFaqs = async () => {
    await queryClient.invalidateQueries({ queryKey: ["faqs"], exact: false });
  };

  const createFaqMutation = useMutation({
    mutationFn: async (payload: FaqFormState) => {
      const res = await apiRequest("POST", "/api/faqs", payload);
      return (await res.json()) as Faq;
    },
    onSuccess: async () => {
      await invalidateFaqs();
      toast({ title: "FAQ added", description: "The FAQ was created successfully." });
      setIsCreateOpen(false);
      setFormState({ ...DEFAULT_FORM, category: INITIAL_CATEGORY, sortOrder: normalizeSortOrder(faqs) });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to add FAQ",
        description: error instanceof Error ? error.message : "Something went wrong while creating the FAQ.",
        variant: "destructive",
      });
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FaqFormState> }) => {
      const res = await apiRequest("PUT", `/api/faqs/${id}`, data);
      return (await res.json()) as Faq;
    },
    onSuccess: async () => {
      await invalidateFaqs();
      toast({ title: "FAQ updated", description: "Changes were saved successfully." });
      setIsEditOpen(false);
      setEditingFaq(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to update FAQ",
        description: error instanceof Error ? error.message : "Something went wrong while updating the FAQ.",
        variant: "destructive",
      });
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/faqs/${id}`);
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.message ?? "Failed to delete FAQ");
      }
      return id;
    },
    onSuccess: async () => {
      await invalidateFaqs();
      toast({ title: "FAQ deleted", description: "The FAQ was removed successfully." });
      setFaqToDelete(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to delete FAQ",
        description: error instanceof Error ? error.message : "Something went wrong while deleting the FAQ.",
        variant: "destructive",
      });
    },
  });

  const reorderFaqsMutation = useMutation({
    mutationFn: async ({ current, target }: { current: Faq; target: Faq }) => {
      await Promise.all([
        apiRequest("PUT", `/api/faqs/${current.id}`, { sortOrder: target.sortOrder }),
        apiRequest("PUT", `/api/faqs/${target.id}`, { sortOrder: current.sortOrder }),
      ]);
    },
    onSuccess: async () => {
      await invalidateFaqs();
    },
    onError: (error: unknown) => {
      toast({
        title: "Reorder failed",
        description: error instanceof Error ? error.message : "Unable to update FAQ order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sortedFaqs = useMemo(() => {
    return [...faqs].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder === bOrder) {
        return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      }
      return aOrder - bOrder;
    });
  }, [faqs]);

  const effectiveSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : localSearchTerm;

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = effectiveSearchTerm.trim().toLowerCase();
    return sortedFaqs.filter((faq) => {
      const matchesCategory = categoryFilter === ALL_CATEGORIES_OPTION || faq.category === categoryFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        faq.question.toLowerCase().includes(normalizedSearch) ||
        faq.answer.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [sortedFaqs, categoryFilter, effectiveSearchTerm]);

  const openCreateDialog = () => {
    setFormState({
      category: INITIAL_CATEGORY,
      question: "",
      answer: "",
      sortOrder: normalizeSortOrder(faqs),
    });
    setIsCreateOpen(true);
  };

  const openEditDialog = (faq: Faq) => {
    setEditingFaq(faq);
    setFormState({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder ?? normalizeSortOrder(faqs),
    });
    setIsEditOpen(true);
  };

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createFaqMutation.mutate(formState);
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingFaq) return;
    updateFaqMutation.mutate({ id: editingFaq.id, data: formState });
  };

  const handleMove = (faq: Faq, direction: "up" | "down") => {
    const index = filteredFaqs.findIndex((f) => f.id === faq.id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredFaqs.length) return;
    reorderFaqsMutation.mutate({ current: filteredFaqs[index], target: filteredFaqs[targetIndex] });
  };

  function formatDate(dateValue?: string | Date) {
    if (!dateValue) return "—";
    const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  }
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6 space-y-6">
          {!externalSearchTerm && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">FAQ Management</h1>
                <p className="text-sm text-gray-600">
                  Create, edit, and reorder FAQs shown to students in the booking dashboard.
                </p>
              </div>
              <Button onClick={openCreateDialog} size="sm" className="self-start sm:self-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add FAQ
              </Button>
            </div>
          )}
          {!externalSearchTerm && <Separator />}
          {!externalSearchTerm && (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex-1">
                      <Label htmlFor="faq-search" className="text-xs uppercase tracking-wide text-gray-500">
                        Search
                      </Label>
                      <Input
                        id="faq-search"
                        placeholder="Search by question or answer"
                        value={localSearchTerm}
                        onChange={(event) => setLocalSearchTerm(event.target.value)}
                      />
                    </div>
                    <div className="w-full md:w-52">
                      <Label className="text-xs uppercase tracking-wide text-gray-500">Category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_CATEGORIES_OPTION}>All categories</SelectItem>
                          {FAQ_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {isFetching ? "Refreshing list…" : `${filteredFaqs.length} FAQ${filteredFaqs.length === 1 ? "" : "s"}`}
                  </div>
                </div>
              )}
          {isLoading ? (
            <div className="overflow-x-auto">
              <SkeletonTableRows rows={5} />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="text-sm text-red-600">We couldn't load FAQs right now.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500">No FAQs found. Try adjusting your filters or add a new FAQ.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Order</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Helpful</TableHead>
                    <TableHead className="hidden md:table-cell">Last updated</TableHead>
                    <TableHead className="w-40 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaqs.map((faq, index) => {
                    const canMoveUp = index > 0;
                    const canMoveDown = index < filteredFaqs.length - 1;
                    return (
                      <TableRow key={faq.id}>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={!canMoveUp || reorderFaqsMutation.isPending}
                              onClick={() => handleMove(faq, "up")}
                              aria-label="Move FAQ up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={!canMoveDown || reorderFaqsMutation.isPending}
                              onClick={() => handleMove(faq, "down")}
                              aria-label="Move FAQ down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="font-medium text-gray-900 leading-snug line-clamp-2">{faq.question}</div>
                          <div className="mt-1 text-xs text-gray-500 md:hidden">
                            <Badge variant="secondary">{faq.category}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-middle">
                          <Badge variant="secondary">{faq.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-middle text-sm text-gray-600">
                          <span className="font-medium text-green-600">{faq.helpfulCount}</span>
                          <span className="mx-1 text-gray-400">/</span>
                          <span className="text-red-500">{faq.notHelpfulCount}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-middle text-sm text-gray-600">
                          {formatDate(faq.updatedAt)}
                        </TableCell>
                        <TableCell className="align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(faq)}
                              disabled={updateFaqMutation.isPending && editingFaq?.id === faq.id}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setFaqToDelete(faq)}
                              disabled={deleteFaqMutation.isPending && faqToDelete?.id === faq.id}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleCreate} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Add FAQ</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="faq-category">Category</Label>
                <Select
                  value={formState.category}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="faq-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAQ_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  required
                  value={formState.question}
                  onChange={(event) => setFormState((prev) => ({ ...prev, question: event.target.value }))}
                  placeholder="Enter the FAQ question"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  required
                  minLength={1}
                  rows={6}
                  value={formState.answer}
                  onChange={(event) => setFormState((prev) => ({ ...prev, answer: event.target.value }))}
                  placeholder="Provide a clear answer for students"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-sort-order">Sort order</Label>
                <Input
                  id="faq-sort-order"
                  type="number"
                  value={formState.sortOrder}
                  onChange={(event) => setFormState((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                  min={0}
                />
                <p className="text-xs text-gray-500">Lower numbers appear first in the student sidebar.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFaqMutation.isPending}>
                {createFaqMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleUpdate} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-faq-category">Category</Label>
                <Select
                  value={formState.category}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="edit-faq-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAQ_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-faq-question">Question</Label>
                <Input
                  id="edit-faq-question"
                  required
                  value={formState.question}
                  onChange={(event) => setFormState((prev) => ({ ...prev, question: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-faq-answer">Answer</Label>
                <Textarea
                  id="edit-faq-answer"
                  required
                  rows={6}
                  value={formState.answer}
                  onChange={(event) => setFormState((prev) => ({ ...prev, answer: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-faq-sort-order">Sort order</Label>
                <Input
                  id="edit-faq-sort-order"
                  type="number"
                  value={formState.sortOrder}
                  onChange={(event) => setFormState((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                  min={0}
                />
                <p className="text-xs text-gray-500">Lower numbers appear first in the student sidebar.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateFaqMutation.isPending}>
                {updateFaqMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={faqToDelete != null} onOpenChange={(open) => !open && setFaqToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{faqToDelete?.question}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFaqMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => faqToDelete && deleteFaqMutation.mutate(faqToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteFaqMutation.isPending}
            >
              {deleteFaqMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
