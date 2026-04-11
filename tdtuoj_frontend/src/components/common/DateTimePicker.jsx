import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, HStack, VStack, Input } from "@chakra-ui/react";
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DDTHH:mm:ss" into { year, month (0-based), day, hour, minute, second } */
const parseValue = (val) => {
  if (!val) return null;
  const [datePart, timePart = "00:00:00"] = val.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return { year, month: month - 1, day, hour: hour || 0, minute: minute || 0, second: second || 0 };
};

/** Format parts back to "YYYY-MM-DDTHH:mm:ss" */
const formatValue = ({ year, month, day, hour, minute, second }) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T` +
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const pad = (n) => String(n).padStart(2, "0");

// ─── Scroll Column ────────────────────────────────────────────────────────────

const ScrollColumn = ({ value, max, onChange, label }) => {
  const items = Array.from({ length: max }, (_, i) => i);
  const listRef = useRef(null);
  const isProgScroll = useRef(false);
  const ITEM_H = 36;

  // Scroll to current value (programmatic — skip onScroll handler)
  useEffect(() => {
    if (listRef.current) {
      isProgScroll.current = true;
      listRef.current.scrollTop = value * ITEM_H;
      // Clear the flag after the browser has finished the scroll
      requestAnimationFrame(() => { isProgScroll.current = false; });
    }
  }, [value]);

  const handleScroll = useCallback(() => {
    if (isProgScroll.current) return; // ignore programmatic scrolls
    if (listRef.current) {
      const idx = Math.round(listRef.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, max - 1));
      if (clamped !== value) onChange(clamped);
    }
  }, [value, max, onChange]);

  return (
    <VStack gap={0}>
      <Box
        as="button"
        type="button"
        p={1}
        color="gray.400"
        _hover={{ color: "purple.600" }}
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ outline: "none" }}
      >
        <ChevronUp size={14} />
      </Box>

      <Box
        ref={listRef}
        h={`${ITEM_H * 3}px`}
        overflowY="scroll"
        onScroll={handleScroll}
        w="48px"
        borderRadius="md"
        bg="gray.50"
        border="1px solid"
        borderColor="gray.200"
        css={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
        position="relative"
      >
        {/* top padding */}
        <Box h={`${ITEM_H}px`} />
        {items.map((i) => (
          <Box
            key={i}
            h={`${ITEM_H}px`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="sm"
            fontWeight={i === value ? "700" : "400"}
            color={i === value ? "purple.700" : "gray.500"}
            bg={i === value ? "purple.50" : "transparent"}
            cursor="pointer"
            onClick={() => onChange(i)}
            transition="all 0.1s"
          >
            {pad(i)}
          </Box>
        ))}
        {/* bottom padding */}
        <Box h={`${ITEM_H}px`} />
      </Box>

      <Box
        as="button"
        type="button"
        p={1}
        color="gray.400"
        _hover={{ color: "purple.600" }}
        onClick={() => onChange(Math.min(max - 1, value + 1))}
        style={{ outline: "none" }}
      >
        <ChevronDown size={14} />
      </Box>

      <Text fontSize="9px" fontWeight="600" color="gray.400" letterSpacing="0.05em" mt={0}>
        {label}
      </Text>
    </VStack>
  );
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

const CalendarGrid = ({ year, month, selected, onSelect, onPrevMonth, onNextMonth }) => {
  const firstDay = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <VStack gap={2}>
      {/* Month navigation */}
      <HStack justify="space-between" w="100%">
        <Box
          as="button"
          type="button"
          p={1}
          borderRadius="md"
          _hover={{ bg: "purple.50" }}
          onClick={onPrevMonth}
          style={{ outline: "none" }}
        >
          <ChevronLeft size={16} color="#7c3aed" />
        </Box>
        <Text fontSize="sm" fontWeight="700" color="gray.700">
          {MONTHS[month]} {year}
        </Text>
        <Box
          as="button"
          type="button"
          p={1}
          borderRadius="md"
          _hover={{ bg: "purple.50" }}
          onClick={onNextMonth}
          style={{ outline: "none" }}
        >
          <ChevronRight size={16} color="#7c3aed" />
        </Box>
      </HStack>

      {/* Day headers */}
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1} w="100%">
        {DAYS.map((d) => (
          <Text key={d} fontSize="10px" fontWeight="700" color="gray.400" textAlign="center">
            {d}
          </Text>
        ))}
        {cells.map((day, idx) => {
          const isSelected = day && day === selected;
          const today = new Date();
          const isToday =
            day &&
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          return (
            <Box
              key={idx}
              h="30px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              borderRadius="full"
              fontSize="xs"
              fontWeight={isSelected ? "700" : "400"}
              bg={isSelected ? "purple.600" : isToday ? "purple.50" : "transparent"}
              color={isSelected ? "white" : isToday ? "purple.600" : day ? "gray.700" : "transparent"}
              border={isToday && !isSelected ? "1px solid" : "1px solid transparent"}
              borderColor={isToday && !isSelected ? "purple.300" : "transparent"}
              cursor={day ? "pointer" : "default"}
              _hover={day && !isSelected ? { bg: "purple.50", color: "purple.700" } : {}}
              onClick={() => day && onSelect(day)}
              transition="all 0.1s"
            >
              {day || ""}
            </Box>
          );
        })}
      </Box>
    </VStack>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * DateTimePicker
 * @prop {string}   value     - ISO-like value "YYYY-MM-DDTHH:mm:ss"
 * @prop {function} onChange  - called with new "YYYY-MM-DDTHH:mm:ss" string
 * @prop {string}   label     - field label
 * @prop {string}   placeholder
 * @prop {boolean}  required
 */
const DateTimePicker = ({ value, onChange, placeholder = "Pick date & time", required }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parsed = parseValue(value);
  const now = new Date();

  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth());

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const update = (patch) => {
    const base = parsed ?? {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: 0, minute: 0, second: 0,
    };
    onChange(formatValue({ ...base, ...patch }));
  };

  const displayText = parsed
    ? `${MONTHS[parsed.month].slice(0, 3)} ${String(parsed.day).padStart(2, "0")}, ${parsed.year}  ${pad(parsed.hour)}:${pad(parsed.minute)}:${pad(parsed.second)}`
    : "";

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <Box ref={containerRef} position="relative" display="inline-flex" w="100%">
      {/* Trigger input */}
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        px={3}
        py={2}
        border="1px solid"
        borderColor={open ? "purple.400" : "gray.200"}
        borderRadius="md"
        bg="white"
        cursor="pointer"
        w="100%"
        onClick={() => setOpen((v) => !v)}
        transition="border-color 0.15s"
        boxShadow={open ? "0 0 0 1px #9f7aea" : "none"}
        _hover={{ borderColor: "purple.300" }}
      >
        <Calendar size={15} color={open ? "#7c3aed" : "#9ca3af"} />
        <Text
          flex={1}
          fontSize="sm"
          color={displayText ? "gray.800" : "gray.400"}
          userSelect="none"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
        >
          {displayText || placeholder}
        </Text>
        <Clock size={14} color="#9ca3af" />
      </Box>

      {/* Popup */}
      {open && (
        <Box
          position="absolute"
          top="calc(100% + 6px)"
          left={0}
          zIndex={200}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="xl"
          boxShadow="xl"
          p={4}
          minW="300px"
        >
          <VStack gap={4} align="stretch">
            {/* Calendar */}
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              selected={parsed?.day}
              onSelect={(day) => update({ year: viewYear, month: viewMonth, day })}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />

            {/* Divider */}
            <Box borderTopWidth="1px" borderColor="gray.100" />

            {/* Time picker */}
            <VStack gap={1} align="center">
              <HStack gap={1} mb={1}>
                <Clock size={13} color="#9ca3af" />
                <Text fontSize="xs" fontWeight="600" color="gray.500">
                  Time
                </Text>
              </HStack>
              <HStack gap={2} align="flex-start">
                <ScrollColumn
                  label="HR"
                  value={parsed?.hour ?? 0}
                  max={24}
                  onChange={(h) => update({ hour: h })}
                />
                <Text pt="38px" fontSize="lg" fontWeight="700" color="gray.400">:</Text>
                <ScrollColumn
                  label="MIN"
                  value={parsed?.minute ?? 0}
                  max={60}
                  onChange={(m) => update({ minute: m })}
                />
                <Text pt="38px" fontSize="lg" fontWeight="700" color="gray.400">:</Text>
                <ScrollColumn
                  label="SEC"
                  value={parsed?.second ?? 0}
                  max={60}
                  onChange={(s) => update({ second: s })}
                />
              </HStack>
            </VStack>

            {/* Action row */}
            <HStack justify="space-between">
              <Box
                as="button"
                type="button"
                fontSize="xs"
                color="gray.400"
                _hover={{ color: "red.400" }}
                onClick={() => { onChange(""); setOpen(false); }}
                style={{ outline: "none" }}
              >
                Clear
              </Box>
              <Box
                as="button"
                type="button"
                px={4}
                py={1}
                bg="purple.600"
                color="white"
                fontSize="xs"
                fontWeight="700"
                borderRadius="lg"
                _hover={{ bg: "purple.700" }}
                onClick={() => setOpen(false)}
                style={{ outline: "none" }}
              >
                Done
              </Box>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default DateTimePicker;
