export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          access_expires_at: string | null
          assigned_email: string | null
          code: string
          created_at: string
          created_by: string
          duration_hours: number
          duration_type: string
          id: string
          is_redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          access_expires_at?: string | null
          assigned_email?: string | null
          code: string
          created_at?: string
          created_by: string
          duration_hours: number
          duration_type: string
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          access_expires_at?: string | null
          assigned_email?: string | null
          code?: string
          created_at?: string
          created_by?: string
          duration_hours?: number
          duration_type?: string
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      connection_urls: {
        Row: {
          api_key: string
          created_at: string
          endpoint_type: string
          id: string
          is_active: boolean
          order_id: string
          url: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          endpoint_type: string
          id?: string
          is_active?: boolean
          order_id: string
          url: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          endpoint_type?: string
          id?: string
          is_active?: boolean
          order_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_urls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_to: string
          code: string
          created_at: string
          created_by: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
        }
        Insert: {
          applicable_to?: string
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Update: {
          applicable_to?: string
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_usd: number
          commitment: string
          created_at: string
          currency_amount: number
          currency_code: string
          expires_at: string | null
          id: string
          is_test_order: boolean
          location: string
          order_number: string
          payment_method: string
          plan_name: string
          rps: number
          server_type: string
          status: string
          tps: number
          transaction_signature: string | null
          user_id: string
        }
        Insert: {
          amount_usd: number
          commitment: string
          created_at?: string
          currency_amount: number
          currency_code: string
          expires_at?: string | null
          id?: string
          is_test_order?: boolean
          location: string
          order_number: string
          payment_method: string
          plan_name: string
          rps: number
          server_type: string
          status?: string
          tps: number
          transaction_signature?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number
          commitment?: string
          created_at?: string
          currency_amount?: number
          currency_code?: string
          expires_at?: string | null
          id?: string
          is_test_order?: boolean
          location?: string
          order_number?: string
          payment_method?: string
          plan_name?: string
          rps?: number
          server_type?: string
          status?: string
          tps?: number
          transaction_signature?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          discord_id: string | null
          discord_username: string | null
          email: string
          id: string
          referral_code: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          email: string
          id?: string
          referral_code?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          email?: string
          id?: string
          referral_code?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          order_amount_usd: number
          order_id: string | null
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          order_amount_usd?: number
          order_id?: string | null
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          order_amount_usd?: number
          order_id?: string | null
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_usage: {
        Row: {
          created_at: string
          discord_id: string
          email: string | null
          fingerprint: string
          id: string
          ip_address: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discord_id: string
          email?: string | null
          fingerprint: string
          id?: string
          ip_address: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          discord_id?: string
          email?: string | null
          fingerprint?: string
          id?: string
          ip_address?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      redeem_access_code: {
        Args: { p_code: string; p_discord_id: string }
        Returns: Json
      }
      validate_discount_code: {
        Args: { code_to_validate: string; server_type: string }
        Returns: {
          applicable_to: string
          code: string
          discount_type: string
          discount_value: number
          error_message: string
          is_valid: boolean
        }[]
      }
      validate_referral_code: {
        Args: { p_code: string }
        Returns: {
          error_message: string
          is_valid: boolean
          referrer_id: string
          referrer_username: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "owner"],
    },
  },
} as const
