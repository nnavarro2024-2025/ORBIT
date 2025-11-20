import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/ui';
import { useScheduleMutations } from "../mutations/useScheduleMutations";
import type { ReportSchedule } from '@/shared/schema';

type ScheduleFormState = {
	reportType: string;
	frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
	dayOfWeek: number | null;
	timeOfDay: string;
	format: string;
	description: string;
	recipients: string;
	isActive: boolean;
	nextRunAt: string;
	lastRunAt: string;
};

const defaultScheduleForm: ScheduleFormState = {
	reportType: '',
	frequency: 'weekly',
	dayOfWeek: 1,
	timeOfDay: '09:00',
	format: 'pdf',
	description: '',
	recipients: '',
	isActive: true,
	nextRunAt: '',
	lastRunAt: '',
};

function toInputDateTimeValue(val: string | Date | null | undefined): string {
	if (!val) return '';
	try {
		const d = new Date(val);
		if (isNaN(d.getTime())) return '';
		const offset = d.getTimezoneOffset();
		const adjusted = new Date(d.getTime() - offset * 60 * 1000);
		return adjusted.toISOString().slice(0, 16);
	} catch {
		return '';
	}
}

export function useReportSchedules(reportSchedules: ReportSchedule[]) {
	const { toast } = useToast();
	const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(defaultScheduleForm);
	const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
	const [scheduleFilter, setScheduleFilter] = useState<'all' | 'active' | 'paused'>('all');
	const [scheduleSort, setScheduleSort] = useState<'next-run' | 'name'>('next-run');
	const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
	const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
	const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ReportSchedule | null>(null);
	const [scheduleActionLoadingId, setScheduleActionLoadingId] = useState<string | null>(null);
	const [scheduleMutationPending, setScheduleMutationPending] = useState(false);
	const [schedulePaginationPage, setSchedulePaginationPage] = useState(0);

	const {
		createScheduleMutation: createScheduleBase,
		updateScheduleMutation: updateScheduleBase,
		deleteScheduleMutation: deleteScheduleBase,
		toggleScheduleActiveMutation,
	} = useScheduleMutations();

	const filteredReportSchedules = useMemo(() => {
		const term = scheduleSearchTerm.trim().toLowerCase();
		const filter = scheduleFilter;
		const sort = scheduleSort;
		let items = Array.isArray(reportSchedules) ? reportSchedules.slice() : [];
    
		if (term) {
			items = items.filter(item => {
				const haystack = [item.reportType, item.description, item.emailRecipients]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				return haystack.includes(term);
			});
		}
    
		if (filter === 'active') {
			items = items.filter(item => item.isActive !== false);
		} else if (filter === 'paused') {
			items = items.filter(item => item.isActive === false);
		}

		items.sort((a, b) => {
			if (sort === 'name') {
				return String(a.reportType || '').localeCompare(String(b.reportType || ''), undefined, { sensitivity: 'base' });
			}
			const aNext = a.nextRunAt ? new Date(a.nextRunAt).getTime() : Infinity;
			const bNext = b.nextRunAt ? new Date(b.nextRunAt).getTime() : Infinity;
			if (aNext === bNext) {
				return String(a.reportType || '').localeCompare(String(b.reportType || ''), undefined, { sensitivity: 'base' });
			}
			return aNext - bNext;
		});

		return items;
	}, [reportSchedules, scheduleSearchTerm, scheduleFilter, scheduleSort]);

	const paginatedReportSchedules = useMemo(() => {
		const pageSize = 8;
		const start = schedulePaginationPage * pageSize;
		return filteredReportSchedules.slice(start, start + pageSize);
	}, [filteredReportSchedules, schedulePaginationPage]);

	const totalSchedulePages = useMemo(() => {
		const pageSize = 8;
		return Math.ceil(filteredReportSchedules.length / pageSize) || 1;
	}, [filteredReportSchedules]);

	const resetScheduleForm = (overrides: Partial<ScheduleFormState> = {}) => {
		setScheduleForm({
			...defaultScheduleForm,
			...overrides,
		});
	};

	const openCreateScheduleModal = () => {
		setEditingScheduleId(null);
		resetScheduleForm();
		setIsScheduleModalOpen(true);
	};

	const openEditScheduleModal = (schedule: ReportSchedule) => {
		setEditingScheduleId(String(schedule.id));
		resetScheduleForm({
			reportType: schedule.reportType || '',
			frequency: (schedule.frequency as any) || 'weekly',
			dayOfWeek: schedule.dayOfWeek ?? null,
			timeOfDay: schedule.timeOfDay || '09:00',
			format: schedule.format || 'pdf',
			description: schedule.description || '',
			recipients: (schedule.emailRecipients || '').trim(),
			isActive: schedule.isActive !== false,
			nextRunAt: toInputDateTimeValue(schedule.nextRunAt || ''),
			lastRunAt: toInputDateTimeValue(schedule.lastRunAt || ''),
		});
		setIsScheduleModalOpen(true);
	};

	const closeScheduleModal = () => {
		setIsScheduleModalOpen(false);
		setEditingScheduleId(null);
		resetScheduleForm();
	};

	const handleScheduleFormChange = <K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) => {
		setScheduleForm(prev => ({ ...prev, [key]: value }));
	};

	const deriveSchedulePayload = (): Partial<ReportSchedule> => {
		const recipients = scheduleForm.recipients
			.split(',')
			.map(entry => entry.trim())
			.filter(Boolean)
			.join(',');

		const payload: Partial<ReportSchedule> = {
			reportType: scheduleForm.reportType.trim(),
			frequency: scheduleForm.frequency,
			dayOfWeek: scheduleForm.frequency === 'weekly' ? scheduleForm.dayOfWeek ?? 0 : null,
			timeOfDay: scheduleForm.timeOfDay || null,
			format: scheduleForm.format || 'pdf',
			description: scheduleForm.description.trim() || null,
			emailRecipients: recipients || null,
			isActive: scheduleForm.isActive,
			nextRunAt: scheduleForm.nextRunAt ? new Date(scheduleForm.nextRunAt) : null,
			lastRunAt: scheduleForm.lastRunAt ? new Date(scheduleForm.lastRunAt) : null,
		};

		if (scheduleForm.frequency !== 'weekly') {
			payload.dayOfWeek = null;
		}

		if (!scheduleForm.nextRunAt) {
			payload.nextRunAt = null;
		}

		if (!scheduleForm.lastRunAt) {
			payload.lastRunAt = null;
		}

		return payload;
	};

	const createScheduleMutation = {
		mutateAsync: async () => {
			setScheduleMutationPending(true);
			try {
				const payload = deriveSchedulePayload();
				await createScheduleBase.mutateAsync(payload);
				closeScheduleModal();
				setSchedulePaginationPage(0);
			} finally {
				setScheduleMutationPending(false);
			}
		},
	};

	const updateScheduleMutation = {
		mutateAsync: async (id: string) => {
			setScheduleMutationPending(true);
			try {
				const payload = deriveSchedulePayload();
				await updateScheduleBase.mutateAsync({ id, payload });
				closeScheduleModal();
			} finally {
				setScheduleMutationPending(false);
			}
		},
	};

	const deleteScheduleMutation = {
		mutateAsync: async (id: string) => {
			setScheduleActionLoadingId(id);
			try {
				await deleteScheduleBase.mutateAsync(id);
				setDeleteScheduleTarget(null);
				setSchedulePaginationPage(0);
			} finally {
				setScheduleActionLoadingId(null);
			}
		},
	};

	const handleScheduleSubmit = async () => {
		if (scheduleMutationPending) return;
		if (!scheduleForm.reportType.trim()) {
			toast({ title: 'Report name required', description: 'Please provide a report name.', variant: 'destructive' });
			return;
		}
		if (scheduleForm.frequency === 'weekly' && (scheduleForm.dayOfWeek === null || scheduleForm.dayOfWeek === undefined)) {
			toast({ title: 'Select weekday', description: 'Please choose the day the report should run.', variant: 'destructive' });
			return;
		}

		if (editingScheduleId) {
			await updateScheduleMutation.mutateAsync(editingScheduleId);
		} else {
			await createScheduleMutation.mutateAsync();
		}
	};

	const handleToggleScheduleActive = async (schedule: ReportSchedule, checked?: boolean) => {
		if (!schedule?.id) return;
		const id = String(schedule.id);
		const nextActive = typeof checked === 'boolean' ? checked : !(schedule.isActive === true);
		setScheduleActionLoadingId(id);
		try {
			await toggleScheduleActiveMutation.mutateAsync({ id, isActive: nextActive });
		} finally {
			setScheduleActionLoadingId(null);
		}
	};

	const schedulesEmptyState = !filteredReportSchedules.length;
	const schedulesHasFilters = !!scheduleSearchTerm || scheduleFilter !== 'all';

	return {
		// State
		scheduleForm,
		scheduleSearchTerm,
		scheduleFilter,
		scheduleSort,
		isScheduleModalOpen,
		editingScheduleId,
		deleteScheduleTarget,
		scheduleActionLoadingId,
		scheduleMutationPending,
		schedulePaginationPage,
    
		// Derived data
		filteredReportSchedules,
		paginatedReportSchedules,
		totalSchedulePages,
		schedulesEmptyState,
		schedulesHasFilters,
    
		// Actions
		setScheduleSearchTerm,
		setScheduleFilter,
		setScheduleSort,
		setDeleteScheduleTarget,
		setSchedulePaginationPage,
		handleScheduleFormChange,
		openCreateScheduleModal,
		openEditScheduleModal,
		closeScheduleModal,
		handleScheduleSubmit,
		handleToggleScheduleActive,
		createScheduleMutation,
		updateScheduleMutation,
		deleteScheduleMutation,
	};
}
