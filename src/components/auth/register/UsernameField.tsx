
import { User } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { RegisterFormValues } from "./registerSchema";

interface UsernameFieldProps {
  form: UseFormReturn<RegisterFormValues>;
}

export const UsernameField = ({ form }: UsernameFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel className="text-gray-800 font-medium">Nome de usuário</FormLabel>
          <FormControl>
            <div className="relative group">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 transition-colors group-hover:text-gray-600" />
              <Input
                className="pl-11 h-12 rounded-xl bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-gray-300 transition-all duration-300 hover:border-gray-300"
                {...field}
              />
            </div>
          </FormControl>
          <p className="text-xs text-gray-600">
            Gerado automaticamente com base no email
          </p>
          <FormMessage className="text-red-500" />
        </FormItem>
      )}
    />
  );
};
