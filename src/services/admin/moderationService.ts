/**
 * Moderation Service — admin operations on reports.
 */
import { Report } from '../../models/Report';
import { ApiError } from '../../utils/ApiError';

export async function listReports(query: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reportedBy', 'name email avatar')
      .populate('reportedUser', 'name email avatar')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);

  return { reports, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getReportById(reportId: string) {
  const report = await Report.findById(reportId)
    .populate('reportedBy', 'name email avatar phone')
    .populate('reportedUser', 'name email avatar phone')
    .populate('callSessionId')
    .populate('resolvedBy', 'name email');
  if (!report) throw ApiError.notFound('Report not found');
  return report;
}

export async function resolveReport(reportId: string, adminId: string, data: {
  status: 'resolved' | 'dismissed';
  resolution: string;
}) {
  const report = await Report.findById(reportId);
  if (!report) throw ApiError.notFound('Report not found');
  if (report.status === 'resolved' || report.status === 'dismissed') {
    throw ApiError.badRequest('Report already resolved');
  }

  report.status = data.status;
  report.resolution = data.resolution;
  report.resolvedBy = adminId as any;
  await report.save();

  return report;
}
