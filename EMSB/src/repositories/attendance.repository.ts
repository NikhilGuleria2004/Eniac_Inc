import type { Collection, Filter } from "mongodb";
import type { AttendanceRecord, AttendanceCorrection, AttendanceStatus } from "../models/attendance.js";
import { getCollection } from "../config/database.js";

export interface AttendanceListFilters {
  employeeId?: string;
  status?: AttendanceStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class AttendanceRepository {
  private get collection(): Collection<AttendanceRecord> {
    return getCollection<AttendanceRecord>("attendance_records");
  }

  private get correctionsCollection(): Collection<AttendanceCorrection> {
    return getCollection<AttendanceCorrection>("attendance_corrections");
  }

  async findById(attendanceId: string): Promise<AttendanceRecord | null> {
    return this.collection.findOne({ attendanceId });
  }

  async exists(attendanceId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ attendanceId });
    return count > 0;
  }

  async findByEmployeeAndDate(employeeId: string, date: Date): Promise<AttendanceRecord | null> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.collection.findOne({
      employeeId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
  }

  async findMany(
    filters: AttendanceListFilters
  ): Promise<{ records: AttendanceRecord[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      ...queryFilters
    } = filters;

    const query: Filter<AttendanceRecord> = {};

    if (queryFilters.employeeId) {
      query.employeeId = queryFilters.employeeId;
    }
    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.startDate || queryFilters.endDate) {
      query.date = {};
      if (queryFilters.startDate) {
        query.date.$gte = queryFilters.startDate;
      }
      if (queryFilters.endDate) {
        query.date.$lte = queryFilters.endDate;
      }
    }

    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { records, total };
  }

  async findByEmployeeId(employeeId: string): Promise<AttendanceRecord[]> {
    return this.collection
      .find({ employeeId })
      .sort({ date: -1 })
      .toArray();
  }

  async create(record: Omit<AttendanceRecord, "_id">): Promise<AttendanceRecord> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...record,
      _id: new ObjectId()
    });
    return { ...record, _id: result.insertedId };
  }

  async update(
    attendanceId: string,
    update: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord | null> {
    await this.collection.updateOne(
      { attendanceId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(attendanceId);
  }

  async findCorrectionById(correctionId: string): Promise<AttendanceCorrection | null> {
    return this.correctionsCollection.findOne({ correctionId });
  }

  async findCorrections(
    filters: { status?: string; page?: number; pageSize?: number }
  ): Promise<{ corrections: AttendanceCorrection[]; total: number }> {
    const { page = 1, pageSize = 20, status } = filters;
    const query: Filter<AttendanceCorrection> = {};

    if (status) {
      query.status = status as AttendanceCorrection["status"];
    }

    const skip = (page - 1) * pageSize;

    const [corrections, total] = await Promise.all([
      this.correctionsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.correctionsCollection.countDocuments(query)
    ]);

    return { corrections, total };
  }

  async createCorrection(
    correction: Omit<AttendanceCorrection, "_id">
  ): Promise<AttendanceCorrection> {
    const { ObjectId } = await import("mongodb");
    const result = await this.correctionsCollection.insertOne({
      ...correction,
      _id: new ObjectId()
    });
    return { ...correction, _id: result.insertedId };
  }

  async updateCorrection(
    correctionId: string,
    update: Partial<AttendanceCorrection>
  ): Promise<AttendanceCorrection | null> {
    await this.correctionsCollection.updateOne(
      { correctionId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findCorrectionById(correctionId);
  }
}
