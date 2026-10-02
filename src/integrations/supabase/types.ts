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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_activities: {
        Row: {
          action: string | null
          category: string | null
          created_at: string
          customer: string | null
          deleted_at: string | null
          id: string
          kontak_pic: string | null
          nama_lokasi: string | null
          on_duty: string | null
          problem: string | null
          product: string | null
          rfo_general: string | null
          shift: string | null
          source_information: string | null
          status: string
          tanggal: string | null
          to_do: string | null
          type_modem_sn: string | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          category?: string | null
          created_at?: string
          customer?: string | null
          deleted_at?: string | null
          id?: string
          kontak_pic?: string | null
          nama_lokasi?: string | null
          on_duty?: string | null
          problem?: string | null
          product?: string | null
          rfo_general?: string | null
          shift?: string | null
          source_information?: string | null
          status?: string
          tanggal?: string | null
          to_do?: string | null
          type_modem_sn?: string | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          category?: string | null
          created_at?: string
          customer?: string | null
          deleted_at?: string | null
          id?: string
          kontak_pic?: string | null
          nama_lokasi?: string | null
          on_duty?: string | null
          problem?: string | null
          product?: string | null
          rfo_general?: string | null
          shift?: string | null
          source_information?: string | null
          status?: string
          tanggal?: string | null
          to_do?: string | null
          type_modem_sn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          data: Json
          id: string
          period: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          period: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          period?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_chats: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          is_active: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_otp: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          otp: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          otp: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          otp?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          asal_gangguan: string | null
          created_at: string
          customer: string | null
          deleted_at: string | null
          durasi: string | null
          id: string
          indikasi_gangguan: string | null
          jenis_ticket: string | null
          keterangan: string | null
          last_update: string | null
          layanan: string | null
          nama_lokasi: string | null
          open_by: string | null
          regional: string | null
          status: string
          tanggal_close: string | null
          tanggal_open: string | null
          team_sem: string | null
          teknisi: string | null
          tiket_epicor: string | null
          tiket_mantools: string | null
          tiket_noxis: string | null
          update_history: Json
          updated_at: string
        }
        Insert: {
          asal_gangguan?: string | null
          created_at?: string
          customer?: string | null
          deleted_at?: string | null
          durasi?: string | null
          id?: string
          indikasi_gangguan?: string | null
          jenis_ticket?: string | null
          keterangan?: string | null
          last_update?: string | null
          layanan?: string | null
          nama_lokasi?: string | null
          open_by?: string | null
          regional?: string | null
          status?: string
          tanggal_close?: string | null
          tanggal_open?: string | null
          team_sem?: string | null
          teknisi?: string | null
          tiket_epicor?: string | null
          tiket_mantools?: string | null
          tiket_noxis?: string | null
          update_history?: Json
          updated_at?: string
        }
        Update: {
          asal_gangguan?: string | null
          created_at?: string
          customer?: string | null
          deleted_at?: string | null
          durasi?: string | null
          id?: string
          indikasi_gangguan?: string | null
          jenis_ticket?: string | null
          keterangan?: string | null
          last_update?: string | null
          layanan?: string | null
          nama_lokasi?: string | null
          open_by?: string | null
          regional?: string | null
          status?: string
          tanggal_close?: string | null
          tanggal_open?: string | null
          team_sem?: string | null
          teknisi?: string | null
          tiket_epicor?: string | null
          tiket_mantools?: string | null
          tiket_noxis?: string | null
          update_history?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
