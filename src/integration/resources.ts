import { Result, ok, err, isOk, isErr } from "../types";
import * as os from "os";

export interface ResourceMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  timestamp: Date;
}

export interface CpuMetrics {
  usage: number; // percentage
  loadAverage: number[];
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export class ResourceMonitor {
  async getMetrics(): Promise<Result<ResourceMetrics, Error>> {
    try {
      const cpu = await this.getCpuMetrics();
      const memory = await this.getMemoryMetrics();
      const disk = await this.getDiskMetrics();

      return ok({
        cpu,
        memory,
        disk,
        timestamp: new Date()
      });
    } catch (error) {
      return err(new Error(`Failed to get metrics: ${error}`));
    }
  }

  private async getCpuMetrics(): Promise<CpuMetrics> {
    // Use os.loadavg() for load average
    const loadAverage = os.loadavg();
    
    // Simple CPU usage estimation (would need more sophisticated approach for accuracy)
    const usage = Math.min(100, (loadAverage[0] || 0) * 25);

    return {
      usage,
      loadAverage
    };
  }

  private async getMemoryMetrics(): Promise<MemoryMetrics> {
    // Use Bun's process.memoryUsage()
    const memUsage = process.memoryUsage();
    
    // Get system memory (simplified - in production would use os module)
    const total = 16 * 1024 * 1024 * 1024; // Assume 16GB for now
    const used = memUsage.heapUsed + memUsage.external;
    const free = total - used;
    const percentage = (used / total) * 100;

    return {
      total,
      used,
      free,
      percentage
    };
  }

  private async getDiskMetrics(): Promise<DiskMetrics> {
    // Simplified disk metrics - in production would use proper system calls
    const total = 500 * 1024 * 1024 * 1024; // Assume 500GB
    const used = 200 * 1024 * 1024 * 1024; // Assume 200GB used
    const free = total - used;
    const percentage = (used / total) * 100;

    return {
      total,
      used,
      free,
      percentage
    };
  }

  async checkResourceAvailability(requirements: ResourceRequirements): Promise<Result<boolean, Error>> {
    const metricsResult = await this.getMetrics();
    if (!isOk(metricsResult)) return metricsResult as Result<boolean, Error>;

    const metrics = metricsResult.value;
    
    // Check if resources meet requirements
    const cpuAvailable = metrics.cpu.usage < (100 - requirements.minCpuPercentage);
    const memoryAvailable = metrics.memory.free >= requirements.minMemoryBytes;
    const diskAvailable = metrics.disk.free >= requirements.minDiskBytes;

    return ok(cpuAvailable && memoryAvailable && diskAvailable);
  }

  formatMetrics(metrics: ResourceMetrics): string {
    return `
Resource Metrics (${metrics.timestamp.toISOString()}):
  CPU:
    Usage: ${metrics.cpu.usage.toFixed(1)}%
    Load Average: ${metrics.cpu.loadAverage.map(n => n.toFixed(2)).join(', ')}
  Memory:
    Total: ${this.formatBytes(metrics.memory.total)}
    Used: ${this.formatBytes(metrics.memory.used)} (${metrics.memory.percentage.toFixed(1)}%)
    Free: ${this.formatBytes(metrics.memory.free)}
  Disk:
    Total: ${this.formatBytes(metrics.disk.total)}
    Used: ${this.formatBytes(metrics.disk.used)} (${metrics.disk.percentage.toFixed(1)}%)
    Free: ${this.formatBytes(metrics.disk.free)}
    `.trim();
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export interface ResourceRequirements {
  minCpuPercentage: number;
  minMemoryBytes: number;
  minDiskBytes: number;
}

// Resource tracking for swarm operations
export class SwarmResourceTracker {
  private startMetrics?: ResourceMetrics;
  private monitor = new ResourceMonitor();

  async startTracking(): Promise<Result<void, Error>> {
    const metricsResult = await this.monitor.getMetrics();
    if (!isOk(metricsResult)) return metricsResult as Result<void, Error>;
    
    this.startMetrics = metricsResult.value;
    return ok(undefined);
  }

  async getResourceDelta(): Promise<Result<ResourceDelta, Error>> {
    if (!this.startMetrics) {
      return err(new Error("Tracking not started"));
    }

    const currentResult = await this.monitor.getMetrics();
    if (!isOk(currentResult)) return currentResult as Result<ResourceDelta, Error>;

    const current = currentResult.value;
    const start = this.startMetrics;

    return ok({
      cpuDelta: current.cpu.usage - start.cpu.usage,
      memoryDelta: current.memory.used - start.memory.used,
      diskDelta: current.disk.used - start.disk.used,
      duration: current.timestamp.getTime() - start.timestamp.getTime()
    });
  }
}

export interface ResourceDelta {
  cpuDelta: number;
  memoryDelta: number;
  diskDelta: number;
  duration: number;
}