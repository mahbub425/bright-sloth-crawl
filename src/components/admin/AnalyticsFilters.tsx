import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Room } from "@/types/database";
import { DateRange } from "react-day-picker"; // Import DateRange type

interface AnalyticsFiltersProps {
  filterRoomId: string | null;
  setFilterRoomId: (id: string | null) => void;
  filterDateRange: DateRange; // Using DateRange type
  setFilterDateRange: (range: DateRange | undefined) => void; // Using DateRange type
  rooms: Room[];
  onApplyFilters: () => void;
  onSavePreferences: () => void;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filterRoomId,
  setFilterRoomId,
  filterDateRange,
  setFilterDateRange,
  rooms,
  onApplyFilters,
  onSavePreferences,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-wrap items-end gap-4">
      {/* Room Filter */}
      <div className="flex flex-col space-y-1">
        <label htmlFor="room-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Room
        </label>
        <Select
          value={filterRoomId || ""}
          onValueChange={(value) => setFilterRoomId(value === "all" ? null : value)}
        >
          <SelectTrigger id="room-filter" className="w-[180px]">
            <SelectValue placeholder="Select Room" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-col space-y-1">
        <label htmlFor="date-range-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Date Range
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-range-filter"
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !filterDateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDateRange?.from ? (
                filterDateRange.to ? (
                  <>
                    {format(filterDateRange.from, "LLL dd, y")} -{" "}
                    {format(filterDateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(filterDateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filterDateRange.from || new Date()}
              selected={filterDateRange}
              onSelect={setFilterDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button onClick={onApplyFilters} className="mt-auto">Apply Filters</Button>
      <Button onClick={onSavePreferences} variant="outline" className="mt-auto">Save Preferences</Button>
    </div>
  );
};

export default AnalyticsFilters;