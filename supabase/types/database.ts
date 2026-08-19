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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_impersonation_audit: {
        Row: {
          admin_id: string
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
          target_profile_id: string | null
          target_tenant_id: string
        }
        Insert: {
          admin_id: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_profile_id?: string | null
          target_tenant_id: string
        }
        Update: {
          admin_id?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_profile_id?: string | null
          target_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_impersonation_audit_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_impersonation_audit_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_impersonation_audit_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_impersonation_audit_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          created_at: string
          id: string
          insight_type: string
          model: string | null
          payload: Json
          period_end: string
          period_start: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insight_type: string
          model?: string | null
          payload: Json
          period_end: string
          period_start: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insight_type?: string
          model?: string | null
          payload?: Json
          period_end?: string
          period_start?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          entry_type: Database["public"]["Enums"]["credit_entry_type"]
          id: string
          note: string | null
          sale_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          entry_type: Database["public"]["Enums"]["credit_entry_type"]
          id?: string
          note?: string | null
          sale_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          entry_type?: Database["public"]["Enums"]["credit_entry_type"]
          id?: string
          note?: string | null
          sale_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_in_app: boolean
          channel_sms: boolean
          channel_sound: boolean
          channel_whatsapp: boolean
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          channel_email?: boolean
          channel_in_app?: boolean
          channel_sms?: boolean
          channel_sound?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          channel_email?: boolean
          channel_in_app?: boolean
          channel_sms?: boolean
          channel_sound?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["notification_priority"]
          recipient_id: string
          recipient_role: Database["public"]["Enums"]["recipient_role"]
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          recipient_id: string
          recipient_role: Database["public"]["Enums"]["recipient_role"]
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          recipient_id?: string
          recipient_role?: Database["public"]["Enums"]["recipient_role"]
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          account: string | null
          amount: number
          api_ref: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string
          payment_channel: Database["public"]["Enums"]["payment_channel"]
          purpose: Database["public"]["Enums"]["payment_purpose"]
          raw_webhook_payload: Json | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string | null
          tracking_id: string | null
          updated_at: string
        }
        Insert: {
          account?: string | null
          amount: number
          api_ref?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          payment_channel?: Database["public"]["Enums"]["payment_channel"]
          purpose: Database["public"]["Enums"]["payment_purpose"]
          raw_webhook_payload?: Json | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Update: {
          account?: string | null
          amount?: number
          api_ref?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          payment_channel?: Database["public"]["Enums"]["payment_channel"]
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          raw_webhook_payload?: Json | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_broadcasts: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          cost_price: number
          created_at: string
          id: string
          is_active: boolean
          is_sample: boolean
          low_stock_threshold: number
          name: string
          selling_price: number
          sku: string | null
          stock_qty: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_sample?: boolean
          low_stock_threshold?: number
          name: string
          selling_price: number
          sku?: string | null
          stock_qty?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_sample?: boolean
          low_stock_threshold?: number
          name?: string
          selling_price?: number
          sku?: string | null
          stock_qty?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          onboarding_completed_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number
          id: string
          line_total: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
          tenant_id: string
          unit_price: number
        }
        Insert: {
          cost_price?: number
          id?: string
          line_total: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
          tenant_id: string
          unit_price: number
        }
        Update: {
          cost_price?: number
          id?: string
          line_total?: number
          product_id?: string
          product_name?: string
          qty?: number
          sale_id?: string
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_phone: string | null
          discount_amount: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_channel: Database["public"]["Enums"]["payment_channel"] | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_channel?:
            | Database["public"]["Enums"]["payment_channel"]
            | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_channel?:
            | Database["public"]["Enums"]["payment_channel"]
            | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_invoice_id: string | null
          plan_code: string
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_invoice_id?: string | null
          plan_code?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_invoice_id?: string | null
          plan_code?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_destinations: {
        Row: {
          account_name: string | null
          account_number: string
          created_at: string
          destination_type: Database["public"]["Enums"]["payment_destination_type"]
          id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          created_at?: string
          destination_type: Database["public"]["Enums"]["payment_destination_type"]
          id?: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          created_at?: string
          destination_type?: Database["public"]["Enums"]["payment_destination_type"]
          id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_destinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_payment_destinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          access_until: string
          address_text: string | null
          category: Database["public"]["Enums"]["business_category"]
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          name: string
          phone: string
          status: Database["public"]["Enums"]["tenant_status"]
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          access_until?: string
          address_text?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          name: string
          phone: string
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          access_until?: string
          address_text?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      unclaimed_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_transaction_id: string | null
          raw_webhook_payload: Json
          resolved_at: string | null
          resolved_by: string | null
          resolved_tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_transaction_id?: string | null
          raw_webhook_payload: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_transaction_id?: string | null
          raw_webhook_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unclaimed_payments_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unclaimed_payments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unclaimed_payments_resolved_tenant_id_fkey"
            columns: ["resolved_tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unclaimed_payments_resolved_tenant_id_fkey"
            columns: ["resolved_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_mrr_snapshot: {
        Row: {
          active_tenants: number | null
          conversions_this_month: number | null
          mrr_kes: number | null
          past_due_tenants: number | null
          suspended_tenants: number | null
          trial_tenants: number | null
        }
        Relationships: []
      }
      admin_tenant_map: {
        Row: {
          access_until: string | null
          address_text: string | null
          category: Database["public"]["Enums"]["business_category"] | null
          created_at: string | null
          current_period_end: string | null
          id: string | null
          location_lat: number | null
          location_lng: number | null
          name: string | null
          phone: string | null
          plan_code: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          subscription_amount: number | null
          trial_ends_at: string | null
        }
        Relationships: []
      }
      customer_loyalty_stats: {
        Row: {
          credit_balance: number | null
          customer_id: string | null
          last_paid_at: string | null
          lifetime_spend: number | null
          name: string | null
          paid_sale_count: number | null
          phone: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      complete_vendor_onboarding: {
        Args: {
          p_account_name?: string
          p_account_number: string
          p_address_text?: string
          p_business_name: string
          p_category: Database["public"]["Enums"]["business_category"]
          p_destination_type: Database["public"]["Enums"]["payment_destination_type"]
          p_full_name?: string
          p_location_lat?: number
          p_location_lng?: number
          p_phone: string
        }
        Returns: Json
      }
      customer_credit_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      tenant_has_access: { Args: { p_tenant_id?: string }; Returns: boolean }
    }
    Enums: {
      business_category:
        | "DUKA"
        | "BOUTIQUE"
        | "CHEMIST"
        | "HARDWARE"
        | "EATERY"
        | "OTHER"
      credit_entry_type: "CHARGE" | "REPAYMENT" | "ADJUSTMENT"
      notification_priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL"
      notification_type:
        | "SALE"
        | "STOCK_LOW"
        | "SUBSCRIPTION"
        | "SYSTEM"
        | "CREDIT"
        | "PAYMENT"
      payment_channel: "MPESA_STK" | "CARD" | "PAYBILL" | "CASH" | "CREDIT"
      payment_destination_type: "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI"
      payment_purpose: "SAAS_SUBSCRIPTION" | "VENDOR_SALE" | "OTHER"
      payment_status: "PENDING" | "COMPLETE" | "FAILED" | "CANCELLED"
      recipient_role: "SUPER_ADMIN" | "VENDOR_ADMIN" | "CUSTOMER"
      sale_status:
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "CREDIT"
        | "CANCELLED"
        | "REFUNDED"
      tenant_status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED"
      user_role: "SUPER_ADMIN" | "VENDOR_ADMIN" | "VENDOR_STAFF"
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
      business_category: [
        "DUKA",
        "BOUTIQUE",
        "CHEMIST",
        "HARDWARE",
        "EATERY",
        "OTHER",
      ],
      credit_entry_type: ["CHARGE", "REPAYMENT", "ADJUSTMENT"],
      notification_priority: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
      notification_type: [
        "SALE",
        "STOCK_LOW",
        "SUBSCRIPTION",
        "SYSTEM",
        "CREDIT",
        "PAYMENT",
      ],
      payment_channel: ["MPESA_STK", "CARD", "PAYBILL", "CASH", "CREDIT"],
      payment_destination_type: ["PERSONAL_MPESA", "TILL", "PAYBILL", "POCHI"],
      payment_purpose: ["SAAS_SUBSCRIPTION", "VENDOR_SALE", "OTHER"],
      payment_status: ["PENDING", "COMPLETE", "FAILED", "CANCELLED"],
      recipient_role: ["SUPER_ADMIN", "VENDOR_ADMIN", "CUSTOMER"],
      sale_status: [
        "DRAFT",
        "PENDING_PAYMENT",
        "PAID",
        "CREDIT",
        "CANCELLED",
        "REFUNDED",
      ],
      tenant_status: ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"],
      user_role: ["SUPER_ADMIN", "VENDOR_ADMIN", "VENDOR_STAFF"],
    },
  },
} as const
