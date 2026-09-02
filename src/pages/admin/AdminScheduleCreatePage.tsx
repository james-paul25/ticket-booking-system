import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scheduleService } from "@/services/scheduleService";
import { supabase } from "@/services/supabase";

const schema = z.object({
  routeName: z.string().min(3),
  origin: z.string().min(2),
  destination: z.string().min(2),
  departureDate: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  vehicleName: z.string().min(2),
  vehicleNumber: z.string().min(2),
  totalSeats: z.coerce.number().int().min(1).max(60),
  price: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

export function AdminScheduleCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { totalSeats: 12 } });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const schedule = await scheduleService.create({
        route_name: values.routeName,
        origin: values.origin,
        destination: values.destination,
        departure_date: values.departureDate,
        departure_time: values.departureTime,
        arrival_time: values.arrivalTime,
        vehicle_name: values.vehicleName,
        vehicle_number: values.vehicleNumber,
        total_seats: values.totalSeats,
        available_seats: values.totalSeats,
        price: values.price,
        status: "scheduled",
      });

      // Auto-generate a simple seat grid (rows A/B/C..., 4 seats per row)
      const rows = ["A", "B", "C", "D", "E", "F"];
      const seatsToInsert = [];
      let remaining = values.totalSeats;
      for (const row of rows) {
        for (let col = 1; col <= 4 && remaining > 0; col++, remaining--) {
          seatsToInsert.push({
            schedule_id: schedule.id,
            seat_number: `${row}${col}`,
            seat_type: row === "A" ? "premium" : "standard",
            price: values.price,
            status: "available" as const,
          });
        }
        if (remaining <= 0) break;
      }
      await supabase.from("seats").insert(seatsToInsert);

      navigate("/admin/schedules");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    }
  }

  return (
    <div className="max-w-2xl mx-auto card p-8">
      <h1 className="text-xl font-semibold mb-6">Add Schedule</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4">
        <Field label="Route name" error={errors.routeName?.message}>
          <input className="input" {...register("routeName")} placeholder="Tagbilaran → Jagna" />
        </Field>
        <Field label="Vehicle name" error={errors.vehicleName?.message}>
          <input className="input" {...register("vehicleName")} />
        </Field>
        <Field label="Origin" error={errors.origin?.message}>
          <input className="input" {...register("origin")} />
        </Field>
        <Field label="Destination" error={errors.destination?.message}>
          <input className="input" {...register("destination")} />
        </Field>
        <Field label="Departure date" error={errors.departureDate?.message}>
          <input type="date" className="input" {...register("departureDate")} />
        </Field>
        <Field label="Vehicle number" error={errors.vehicleNumber?.message}>
          <input className="input" {...register("vehicleNumber")} />
        </Field>
        <Field label="Departure time" error={errors.departureTime?.message}>
          <input type="time" className="input" {...register("departureTime")} />
        </Field>
        <Field label="Arrival time" error={errors.arrivalTime?.message}>
          <input type="time" className="input" {...register("arrivalTime")} />
        </Field>
        <Field label="Total seats" error={errors.totalSeats?.message}>
          <input type="number" className="input" {...register("totalSeats")} />
        </Field>
        <Field label="Price (₱)" error={errors.price?.message}>
          <input type="number" step="0.01" className="input" {...register("price")} />
        </Field>

        {error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}
        <button className="sm:col-span-2 btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create Schedule"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
