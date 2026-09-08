--
-- PostgreSQL database dump
--

\restrict 8NsBRx71mj2i19LXs23Kbc4x1NkLWlCxwml4r5haz6eQLgmC6dM26gjH3zSGf1g

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.part_price_history DROP CONSTRAINT IF EXISTS part_price_history_part_id_fkey;
DROP INDEX IF EXISTS public.idx_pl_inv_number;
DROP INDEX IF EXISTS public.idx_inv_number;
DROP INDEX IF EXISTS public.idx_do_number;
DROP INDEX IF EXISTS public.idx_dl_is_deleted;
DROP INDEX IF EXISTS public.idx_dl_doc_type;
DROP INDEX IF EXISTS public.idx_dl_doc_number;
DROP INDEX IF EXISTS public.idx_dl_doc_date;
DROP INDEX IF EXISTS public.idx_dl_customer_name;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_terms DROP CONSTRAINT IF EXISTS payment_terms_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_terms DROP CONSTRAINT IF EXISTS payment_terms_name_key;
ALTER TABLE IF EXISTS ONLY public.parts DROP CONSTRAINT IF EXISTS parts_pkey;
ALTER TABLE IF EXISTS ONLY public.part_price_history DROP CONSTRAINT IF EXISTS part_price_history_pkey;
ALTER TABLE IF EXISTS ONLY public.packing_lists DROP CONSTRAINT IF EXISTS packing_lists_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_terms DROP CONSTRAINT IF EXISTS delivery_terms_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_terms DROP CONSTRAINT IF EXISTS delivery_terms_name_key;
ALTER TABLE IF EXISTS ONLY public.delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.data_logger DROP CONSTRAINT IF EXISTS data_logger_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_customer_id_key;
ALTER TABLE IF EXISTS public.payment_terms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.parts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.part_price_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.packing_lists ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.delivery_terms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.delivery_orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.data_logger ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customers ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.settings;
DROP SEQUENCE IF EXISTS public.payment_terms_id_seq;
DROP TABLE IF EXISTS public.payment_terms;
DROP SEQUENCE IF EXISTS public.parts_id_seq;
DROP TABLE IF EXISTS public.parts;
DROP SEQUENCE IF EXISTS public.part_price_history_id_seq;
DROP TABLE IF EXISTS public.part_price_history;
DROP SEQUENCE IF EXISTS public.packing_lists_id_seq;
DROP TABLE IF EXISTS public.packing_lists;
DROP SEQUENCE IF EXISTS public.invoices_id_seq;
DROP TABLE IF EXISTS public.invoices;
DROP SEQUENCE IF EXISTS public.delivery_terms_id_seq;
DROP TABLE IF EXISTS public.delivery_terms;
DROP SEQUENCE IF EXISTS public.delivery_orders_id_seq;
DROP TABLE IF EXISTS public.delivery_orders;
DROP SEQUENCE IF EXISTS public.data_logger_id_seq;
DROP TABLE IF EXISTS public.data_logger;
DROP SEQUENCE IF EXISTS public.customers_id_seq;
DROP TABLE IF EXISTS public.customers;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    customer_id character varying(100),
    customer_name character varying(255) NOT NULL,
    address text,
    bill_to text,
    ship_to text,
    contact_person character varying(255),
    phone character varying(100),
    is_dummy smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: data_logger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_logger (
    id integer NOT NULL,
    doc_type character varying(50) NOT NULL,
    doc_number character varying(100) NOT NULL,
    doc_date character varying(50) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_id character varying(100),
    po_no character varying(100),
    part_name character varying(255),
    box_qty integer DEFAULT 0,
    pallet_qty integer DEFAULT 0,
    terms_of_delivery character varying(100),
    payment_term character varying(100),
    dimensions character varying(100),
    image_url text,
    notes text,
    items text,
    ref_id integer,
    grand_total numeric DEFAULT 0,
    unit_price numeric DEFAULT 0,
    currency character varying(10) DEFAULT 'USD'::character varying,
    is_dummy smallint DEFAULT 0,
    is_deleted smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.data_logger OWNER TO postgres;

--
-- Name: data_logger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_logger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_logger_id_seq OWNER TO postgres;

--
-- Name: data_logger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_logger_id_seq OWNED BY public.data_logger.id;


--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_orders (
    id integer NOT NULL,
    do_number character varying(100) NOT NULL,
    do_date character varying(50) NOT NULL,
    invoice_number character varying(100),
    customer_name character varying(255) NOT NULL,
    customer_id character varying(100),
    customer_po_no character varying(100),
    part_name character varying(255),
    pallet_qty integer DEFAULT 0,
    box_qty integer DEFAULT 0,
    notes text,
    items text,
    is_dummy smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.delivery_orders OWNER TO postgres;

--
-- Name: delivery_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_orders_id_seq OWNER TO postgres;

--
-- Name: delivery_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_orders_id_seq OWNED BY public.delivery_orders.id;


--
-- Name: delivery_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_terms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.delivery_terms OWNER TO postgres;

--
-- Name: delivery_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_terms_id_seq OWNER TO postgres;

--
-- Name: delivery_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_terms_id_seq OWNED BY public.delivery_terms.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date character varying(50) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_id character varying(100),
    payment_term character varying(100),
    terms_of_delivery character varying(100),
    customer_po_no character varying(100),
    part_name character varying(255),
    no_of_pallet integer DEFAULT 0,
    no_of_box integer DEFAULT 0,
    image_url text,
    notes text,
    items text,
    bill_to text,
    ship_to text,
    hts_code character varying(50),
    qty_per_box integer DEFAULT 0,
    total_qty integer DEFAULT 0,
    unit_price numeric DEFAULT 0,
    total_amount numeric DEFAULT 0,
    vat_rate numeric DEFAULT 11,
    vat_amount numeric DEFAULT 0,
    grand_total numeric DEFAULT 0,
    currency character varying(10) DEFAULT 'USD'::character varying,
    is_dummy smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: packing_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.packing_lists (
    id integer NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date character varying(50) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_po_no character varying(100),
    part_name character varying(255),
    terms_of_delivery character varying(100),
    box_qty integer DEFAULT 0,
    pallet_qty integer DEFAULT 0,
    length numeric DEFAULT 0,
    width numeric DEFAULT 0,
    height numeric DEFAULT 0,
    unit_note character varying(20),
    image_url text,
    notes text,
    items text,
    is_dummy smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.packing_lists OWNER TO postgres;

--
-- Name: packing_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.packing_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.packing_lists_id_seq OWNER TO postgres;

--
-- Name: packing_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.packing_lists_id_seq OWNED BY public.packing_lists.id;


--
-- Name: part_price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.part_price_history (
    id integer NOT NULL,
    part_id integer NOT NULL,
    price numeric NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    effective_date date NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.part_price_history OWNER TO postgres;

--
-- Name: part_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.part_price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.part_price_history_id_seq OWNER TO postgres;

--
-- Name: part_price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.part_price_history_id_seq OWNED BY public.part_price_history.id;


--
-- Name: parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parts (
    id integer NOT NULL,
    part_name character varying(255) NOT NULL,
    part_no character varying(100) NOT NULL,
    length numeric DEFAULT 0,
    width numeric DEFAULT 0,
    height numeric DEFAULT 0,
    unit character varying(20) DEFAULT 'mm'::character varying,
    qty_per_box integer DEFAULT 0,
    price numeric DEFAULT 0,
    is_dummy smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.parts OWNER TO postgres;

--
-- Name: parts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parts_id_seq OWNER TO postgres;

--
-- Name: parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parts_id_seq OWNED BY public.parts.id;


--
-- Name: payment_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_terms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.payment_terms OWNER TO postgres;

--
-- Name: payment_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_terms_id_seq OWNER TO postgres;

--
-- Name: payment_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_terms_id_seq OWNED BY public.payment_terms.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    company_name character varying(255) DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI'::character varying,
    company_address_line1 text DEFAULT 'Kawasan Industri MM2100 Blok LL-1'::text,
    company_address_line2 text DEFAULT 'Cikarang Barat, Bekasi 17520 - INDONESIA'::text,
    company_phone character varying(100) DEFAULT '+62 21 8980300'::character varying,
    company_fax character varying(100) DEFAULT '+62 21 8980301'::character varying,
    company_website character varying(100) DEFAULT 'www.patco.co.id'::character varying,
    company_logo_url text DEFAULT ''::text,
    iso_cert_logo_url text DEFAULT ''::text,
    tuv_cert_logo_url text DEFAULT ''::text,
    hts_code_invoice character varying(50) DEFAULT '8504.40.90'::character varying,
    hts_code_do character varying(50) DEFAULT '8504.40.00'::character varying,
    bank_drawn_in_favour character varying(255) DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI'::character varying,
    bank_name character varying(255) DEFAULT 'BANK CENTRAL ASIA (BCA)'::character varying,
    bank_account_no character varying(100) DEFAULT '123-456-7890'::character varying,
    bank_swift_code character varying(50) DEFAULT 'CENAIDJA'::character varying,
    bank_branch character varying(255) DEFAULT 'KCU Cikarang Industrial Estate'::character varying,
    bank_currency character varying(10) DEFAULT 'USD'::character varying,
    country_of_origin character varying(100) DEFAULT 'INDONESIA'::character varying,
    manufacture_name_address text DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI, Kawasan Industri MM2100, Bekasi, Jawa Barat, Indonesia'::text,
    prepared_by_name character varying(255) DEFAULT 'Staff Ekspor / Logistik'::character varying,
    prepared_by_title character varying(255) DEFAULT 'Prepared By'::character varying,
    prepared_by_sign_url text DEFAULT ''::text,
    authorized_sign_name character varying(255) DEFAULT 'Finance & Accounting Dept'::character varying,
    authorized_sign_title character varying(255) DEFAULT 'Authorized Signature'::character varying,
    authorized_sign_url text DEFAULT ''::text,
    doc_control_code character varying(100) DEFAULT 'FRM-ACC-01 Rev.02'::character varying,
    show_letterhead smallint DEFAULT 1,
    pl_prepared_by_name character varying(255) DEFAULT 'Staff Warehouse'::character varying,
    pl_prepared_by_title character varying(255) DEFAULT 'Prepared By'::character varying,
    pl_authorized_name character varying(255) DEFAULT 'Warehouse Supervisor'::character varying,
    pl_authorized_title character varying(255) DEFAULT 'Authorized Signature'::character varying,
    pl_doc_control_code character varying(100) DEFAULT 'FRM-WHS-02 Rev.01'::character varying,
    do_drawn_in_favour character varying(255) DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI'::character varying,
    do_sign_col1_title character varying(100) DEFAULT 'Prepared By'::character varying,
    do_sign_col1_name character varying(255) DEFAULT ''::character varying,
    do_sign_col2_title character varying(100) DEFAULT 'Checked By'::character varying,
    do_sign_col2_name character varying(255) DEFAULT ''::character varying,
    do_sign_col3_title character varying(100) DEFAULT 'Approved By'::character varying,
    do_sign_col3_name character varying(255) DEFAULT ''::character varying,
    do_sign_col4_title character varying(100) DEFAULT 'Security'::character varying,
    do_sign_col4_name character varying(255) DEFAULT ''::character varying,
    do_sign_col5_title character varying(100) DEFAULT 'Driver'::character varying,
    do_sign_col5_name character varying(255) DEFAULT ''::character varying,
    do_sign_col6_title character varying(100) DEFAULT 'Received By'::character varying,
    do_sign_col6_name character varying(255) DEFAULT ''::character varying,
    do_doc_control_code character varying(100) DEFAULT 'FRM-WHS-01 Rev.00'::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: data_logger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_logger ALTER COLUMN id SET DEFAULT nextval('public.data_logger_id_seq'::regclass);


--
-- Name: delivery_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders ALTER COLUMN id SET DEFAULT nextval('public.delivery_orders_id_seq'::regclass);


--
-- Name: delivery_terms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_terms ALTER COLUMN id SET DEFAULT nextval('public.delivery_terms_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: packing_lists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packing_lists ALTER COLUMN id SET DEFAULT nextval('public.packing_lists_id_seq'::regclass);


--
-- Name: part_price_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_price_history ALTER COLUMN id SET DEFAULT nextval('public.part_price_history_id_seq'::regclass);


--
-- Name: parts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts ALTER COLUMN id SET DEFAULT nextval('public.parts_id_seq'::regclass);


--
-- Name: payment_terms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_terms ALTER COLUMN id SET DEFAULT nextval('public.payment_terms_id_seq'::regclass);


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, customer_id, customer_name, address, bill_to, ship_to, contact_person, phone, is_dummy, created_at) FROM stdin;
119	CUST-AHM-01	PT. Astra Honda Motor	Kawasan Industri MM2100 Blok LL-1, Cikarang Barat, Bekasi 17520	PT. Astra Honda Motor\nFinance & Accounting Division\nJl. Laksda Yos Sudarso, Sunter 1, Jakarta Utara 14350\nTel: +62 21 8980300	PT. Astra Honda Motor - Plant 3 Cikarang\nKawasan Industri MM2100 Blok LL-1, Cikarang Barat, Bekasi 17520	Budi Santoso / Procurement Dept	+62 21 8980300	1	2026-09-08 03:40:42
120	CUST-TMMIN-02	PT. Toyota Motor Manufacturing Indonesia	Kawasan KIIC Lot B-1, Karawang Barat 41361	PT. Toyota Motor Manufacturing Indonesia\nFinance & Accounting Division\nKawasan KIIC Lot B-1, Karawang Barat 41361\nTel: +62 21 8904500	PT. Toyota Motor Manufacturing Indonesia - Karawang Plant 1\nKawasan KIIC Lot B-1, Karawang Barat 41361	Ahmad Hidayat / Purchasing	+62 21 8904500	1	2026-09-08 03:40:42
121	CUST-DENSO-03	PT. Denso Indonesia	Kawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520	PT. Denso Indonesia\nAccounting & Tax Dept.\nKawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520\nTel: +62 21 8980123	PT. Denso Indonesia - Receiving Warehouse Plant 2\nKawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520	Doni Pratama / Material Control	+62 21 8980123	1	2026-09-08 03:40:43
122	CUST-YIMM-04	PT. Yamaha Indonesia Motor Mfg.	Jl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat	Rian Kurniawan / Supply Chain	+62 21 4607880	1	2026-09-08 03:40:43
123	CUST-EPSON-05	PT. Indonesia Epson Industry	Kawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550	PT. Indonesia Epson Industry\nFinance Department\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550\nTel: +62 21 8970101	PT. Indonesia Epson Industry - Main Logistic Hub\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550	Dewi Lestari / Purchasing Sub-Leader	+62 21 8970101	1	2026-09-08 03:40:43
\.


--
-- Data for Name: data_logger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_logger (id, doc_type, doc_number, doc_date, customer_name, customer_id, po_no, part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, items, ref_id, grand_total, unit_price, currency, is_dummy, is_deleted, created_at) FROM stdin;
194	INVOICE	INV/2026/04/165	2026-04-07	PT. Denso Indonesia	CUST-DENSO-03	PO-PTDEN-7029	Pinion Gear Transmission Planetary Type	39	2	Ex-Works	Net 45 Days	350 x 250 x 200 mm	\N	\N	\N	80	15093	6.45	USD	1	0	2026-09-08 03:40:48
195	PACKING_LIST	INV/2026/04/165	2026-04-08	PT. Denso Indonesia	CUST-DENSO-03	PO-PTDEN-7029	Pinion Gear Transmission Planetary Type	39	2	Ref Inv: INV/2026/04/165	Net 45 Days	350 x 250 x 200 mm	\N	\N	\N	80	15093	6.45	USD	1	0	2026-09-08 03:40:48
196	DELIVERY_ORDER	DO/2026/04/103	2026-04-09	PT. Denso Indonesia	CUST-DENSO-03	PO-PTDEN-7029	Pinion Gear Transmission Planetary Type	39	2	Ref Inv: INV/2026/04/165	Net 45 Days	350 x 250 x 200 mm	\N	\N	\N	80	15093	6.45	USD	1	0	2026-09-08 03:40:48
197	INVOICE	INV/2026/06/231	2026-06-07	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-3806	Shaft Drive Axle Front Precision Ground	34	2	Ex-Works	Net 45 Days	600 x 120 x 120 mm	\N	\N	\N	81	12076.8	12.8	USD	1	0	2026-09-08 03:40:48
198	PACKING_LIST	INV/2026/06/231	2026-06-08	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-3806	Shaft Drive Axle Front Precision Ground	34	2	Ref Inv: INV/2026/06/231	Net 45 Days	600 x 120 x 120 mm	\N	\N	\N	81	12076.8	12.8	USD	1	0	2026-09-08 03:40:48
199	DELIVERY_ORDER	DO/2026/06/848	2026-06-08	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-3806	Shaft Drive Axle Front Precision Ground	34	2	Ref Inv: INV/2026/06/231	Net 45 Days	600 x 120 x 120 mm	\N	\N	\N	81	12076.8	12.8	USD	1	0	2026-09-08 03:40:48
200	INVOICE	INV/2026/06/777	2026-06-20	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-4192	Cover Side Upper LH - Matte Black Spec	50	3	Ex-Works	Net 45 Days	500 x 220 x 160 mm	\N	\N	\N	82	12654	2.85	USD	1	0	2026-09-08 03:40:48
201	PACKING_LIST	INV/2026/06/777	2026-06-20	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-4192	Cover Side Upper LH - Matte Black Spec	50	3	Ref Inv: INV/2026/06/777	Net 45 Days	500 x 220 x 160 mm	\N	\N	\N	82	12654	2.85	USD	1	0	2026-09-08 03:40:48
202	DELIVERY_ORDER	DO/2026/06/359	2026-06-21	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-4192	Cover Side Upper LH - Matte Black Spec	50	3	Ref Inv: INV/2026/06/777	Net 45 Days	500 x 220 x 160 mm	\N	\N	\N	82	12654	2.85	USD	1	0	2026-09-08 03:40:48
203	INVOICE	INV/2026/08/649	2026-08-05	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-5086	Pinion Gear Transmission Planetary Type	56	3	Ex-Works	Net 60 Days	350 x 250 x 200 mm	\N	\N	\N	83	24055.92	6.45	USD	1	0	2026-09-08 03:40:48
204	PACKING_LIST	INV/2026/08/649	2026-08-05	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-5086	Pinion Gear Transmission Planetary Type	56	3	Ref Inv: INV/2026/08/649	Net 60 Days	350 x 250 x 200 mm	\N	\N	\N	83	24055.92	6.45	USD	1	0	2026-09-08 03:40:48
205	DELIVERY_ORDER	DO/2026/08/684	2026-08-06	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-5086	Pinion Gear Transmission Planetary Type	56	3	Ref Inv: INV/2026/08/649	Net 60 Days	350 x 250 x 200 mm	\N	\N	\N	83	24055.92	6.45	USD	1	0	2026-09-08 03:40:48
206	INVOICE	INV/2026/08/367	2026-08-13	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-9723	Housing Clutch Outer Stamping Spec A	26	2	FOB Tanjung Priok	Net 30 Days	320 x 320 x 180 mm	\N	\N	\N	84	9754.68	8.45	USD	1	0	2026-09-08 03:40:48
207	PACKING_LIST	INV/2026/08/367	2026-08-14	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-9723	Housing Clutch Outer Stamping Spec A	26	2	Ref Inv: INV/2026/08/367	Net 30 Days	320 x 320 x 180 mm	\N	\N	\N	84	9754.68	8.45	USD	1	0	2026-09-08 03:40:48
208	INVOICE	INV/2026/08/175	2026-08-17	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-9430	Housing Clutch Outer Stamping Spec A	50	3	Franco Cikarang	Net 60 Days	320 x 320 x 180 mm	\N	\N	\N	85	18759	8.45	USD	1	0	2026-09-08 03:40:48
209	PACKING_LIST	INV/2026/08/175	2026-08-17	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-9430	Housing Clutch Outer Stamping Spec A	50	3	Ref Inv: INV/2026/08/175	Net 60 Days	320 x 320 x 180 mm	\N	\N	\N	85	18759	8.45	USD	1	0	2026-09-08 03:40:48
210	DELIVERY_ORDER	DO/2026/08/701	2026-08-18	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-9430	Housing Clutch Outer Stamping Spec A	50	3	Ref Inv: INV/2026/08/175	Net 60 Days	320 x 320 x 180 mm	\N	\N	\N	85	18759	8.45	USD	1	0	2026-09-08 03:40:48
211	INVOICE	INV/2026/08/489	2026-08-18	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-9327	Pinion Gear Transmission Planetary Type	40	2	FOB Tanjung Priok	Ex-Works	350 x 250 x 200 mm	\N	\N	\N	86	17182.8	6.45	USD	1	0	2026-09-08 03:40:49
212	DELIVERY_ORDER	DO/2026/08/654	2026-08-19	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-9327	Pinion Gear Transmission Planetary Type	40	2	Ref Inv: INV/2026/08/489	Ex-Works	350 x 250 x 200 mm	\N	\N	\N	86	17182.8	6.45	USD	1	0	2026-09-08 03:40:49
213	INVOICE	INV/2026/08/133	2026-08-21	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-7023	Pinion Gear Transmission Planetary Type	41	3	CIF Tanjung Priok	Net 30 Days	350 x 250 x 200 mm	\N	\N	\N	87	17612.37	6.45	USD	1	0	2026-09-08 03:40:49
214	PACKING_LIST	INV/2026/08/133	2026-08-21	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-7023	Pinion Gear Transmission Planetary Type	41	3	Ref Inv: INV/2026/08/133	Net 30 Days	350 x 250 x 200 mm	\N	\N	\N	87	17612.37	6.45	USD	1	0	2026-09-08 03:40:49
215	DELIVERY_ORDER	DO/2026/08/363	2026-08-23	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-7023	Pinion Gear Transmission Planetary Type	41	3	Ref Inv: INV/2026/08/133	Net 30 Days	350 x 250 x 200 mm	\N	\N	\N	87	17612.37	6.45	USD	1	0	2026-09-08 03:40:49
216	INVOICE	INV/2026/08/586	2026-08-24	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-3534	Bracket Engine Mount RH High-Tensile	54	3	FOB Tanjung Priok	Ex-Works	400 x 250 x 200 mm	\N	\N	\N	88	15734.25	5.25	USD	1	0	2026-09-08 03:40:49
217	PACKING_LIST	INV/2026/08/586	2026-08-24	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-3534	Bracket Engine Mount RH High-Tensile	54	3	Ref Inv: INV/2026/08/586	Ex-Works	400 x 250 x 200 mm	\N	\N	\N	88	15734.25	5.25	USD	1	0	2026-09-08 03:40:49
218	DELIVERY_ORDER	DO/2026/08/011	2026-08-26	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-3534	Bracket Engine Mount RH High-Tensile	54	3	Ref Inv: INV/2026/08/586	Ex-Works	400 x 250 x 200 mm	\N	\N	\N	88	15734.25	5.25	USD	1	0	2026-09-08 03:40:49
219	INVOICE	INV/2026/08/703	2026-08-31	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-3719	Shaft Drive Axle Front Precision Ground	32	2	Franco Cikarang	Ex-Works	600 x 120 x 120 mm	\N	\N	\N	89	11366.4	12.8	USD	1	0	2026-09-08 03:40:49
220	PACKING_LIST	INV/2026/08/703	2026-09-01	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-3719	Shaft Drive Axle Front Precision Ground	32	2	Ref Inv: INV/2026/08/703	Ex-Works	600 x 120 x 120 mm	\N	\N	\N	89	11366.4	12.8	USD	1	0	2026-09-08 03:40:49
\.


--
-- Data for Name: delivery_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_orders (id, do_number, do_date, invoice_number, customer_name, customer_id, customer_po_no, part_name, pallet_qty, box_qty, notes, items, is_dummy, created_at) FROM stdin;
46	DO/2026/04/103	2026-04-09	INV/2026/04/165	PT. Denso Indonesia	CUST-DENSO-03	PO-PTDEN-7029	Pinion Gear Transmission Planetary Type	2	39	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTDEN-7029	\N	1	2026-09-08 03:40:48
47	DO/2026/06/848	2026-06-08	INV/2026/06/231	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-3806	Shaft Drive Axle Front Precision Ground	2	34	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTYAM-3806	\N	1	2026-09-08 03:40:48
48	DO/2026/06/359	2026-06-21	INV/2026/06/777	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-4192	Cover Side Upper LH - Matte Black Spec	3	50	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTTOY-4192	\N	1	2026-09-08 03:40:48
49	DO/2026/08/684	2026-08-06	INV/2026/08/649	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-5086	Pinion Gear Transmission Planetary Type	3	56	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTYAM-5086	\N	1	2026-09-08 03:40:48
50	DO/2026/08/701	2026-08-18	INV/2026/08/175	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	PO-PTYAM-9430	Housing Clutch Outer Stamping Spec A	3	50	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTYAM-9430	\N	1	2026-09-08 03:40:48
51	DO/2026/08/654	2026-08-19	INV/2026/08/489	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-9327	Pinion Gear Transmission Planetary Type	2	40	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTIND-9327	\N	1	2026-09-08 03:40:49
52	DO/2026/08/363	2026-08-23	INV/2026/08/133	PT. Indonesia Epson Industry	CUST-EPSON-05	PO-PTIND-7023	Pinion Gear Transmission Planetary Type	3	41	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTIND-7023	\N	1	2026-09-08 03:40:49
53	DO/2026/08/011	2026-08-26	INV/2026/08/586	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	PO-PTTOY-3534	Bracket Engine Mount RH High-Tensile	3	54	Surat Jalan resmi pengiriman barang fisik sesuai PO: PO-PTTOY-3534	\N	1	2026-09-08 03:40:49
\.


--
-- Data for Name: delivery_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_terms (id, name, description) FROM stdin;
51	Ex-Works	Ketentuan pengiriman Ex-Works
52	FOB Tanjung Priok	Ketentuan pengiriman FOB Tanjung Priok
53	CIF Tanjung Priok	Ketentuan pengiriman CIF Tanjung Priok
54	Franco Cikarang	Ketentuan pengiriman Franco Cikarang
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, invoice_date, customer_name, customer_id, payment_term, terms_of_delivery, customer_po_no, part_name, no_of_pallet, no_of_box, image_url, notes, items, bill_to, ship_to, hts_code, qty_per_box, total_qty, unit_price, total_amount, vat_rate, vat_amount, grand_total, currency, is_dummy, created_at) FROM stdin;
80	INV/2026/04/165	2026-04-07	PT. Denso Indonesia	CUST-DENSO-03	Net 45 Days	Ex-Works	PO-PTDEN-7029	Pinion Gear Transmission Planetary Type	2	39	\N	\N	\N	PT. Denso Indonesia\nAccounting & Tax Dept.\nKawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520\nTel: +62 21 8980123	PT. Denso Indonesia - Receiving Warehouse Plant 2\nKawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520	8544.30.00	60	2340	6.45	15093	0	0	15093	USD	1	2026-09-08 03:40:48
81	INV/2026/06/231	2026-06-07	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	Net 45 Days	Ex-Works	PO-PTYAM-3806	Shaft Drive Axle Front Precision Ground	2	34	\N	\N	\N	PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat	8504.40.90	25	850	12.8	10880	11	1196.8	12076.8	USD	1	2026-09-08 03:40:48
82	INV/2026/06/777	2026-06-20	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	Net 45 Days	Ex-Works	PO-PTTOY-4192	Cover Side Upper LH - Matte Black Spec	3	50	\N	\N	\N	PT. Toyota Motor Manufacturing Indonesia\nFinance & Accounting Division\nKawasan KIIC Lot B-1, Karawang Barat 41361\nTel: +62 21 8904500	PT. Toyota Motor Manufacturing Indonesia - Karawang Plant 1\nKawasan KIIC Lot B-1, Karawang Barat 41361	8708.99.90	80	4000	2.85	11400	11	1254	12654	USD	1	2026-09-08 03:40:48
83	INV/2026/08/649	2026-08-05	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	Net 60 Days	Ex-Works	PO-PTYAM-5086	Pinion Gear Transmission Planetary Type	3	56	\N	\N	\N	PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat	8708.99.90	60	3360	6.45	21672	11	2383.92	24055.92	USD	1	2026-09-08 03:40:48
84	INV/2026/08/367	2026-08-13	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	Net 30 Days	FOB Tanjung Priok	PO-PTYAM-9723	Housing Clutch Outer Stamping Spec A	2	26	\N	\N	\N	PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat	8708.99.90	40	1040	8.45	8788	11	966.68	9754.68	USD	1	2026-09-08 03:40:48
85	INV/2026/08/175	2026-08-17	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	Net 60 Days	Franco Cikarang	PO-PTYAM-9430	Housing Clutch Outer Stamping Spec A	3	50	\N	\N	\N	PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat	8544.30.00	40	2000	8.45	16900	11	1859	18759	USD	1	2026-09-08 03:40:48
86	INV/2026/08/489	2026-08-18	PT. Indonesia Epson Industry	CUST-EPSON-05	Ex-Works	FOB Tanjung Priok	PO-PTIND-9327	Pinion Gear Transmission Planetary Type	2	40	\N	\N	\N	PT. Indonesia Epson Industry\nFinance Department\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550\nTel: +62 21 8970101	PT. Indonesia Epson Industry - Main Logistic Hub\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550	8708.29.99	60	2400	6.45	15480	11	1702.8	17182.8	USD	1	2026-09-08 03:40:49
87	INV/2026/08/133	2026-08-21	PT. Indonesia Epson Industry	CUST-EPSON-05	Net 30 Days	CIF Tanjung Priok	PO-PTIND-7023	Pinion Gear Transmission Planetary Type	3	41	\N	\N	\N	PT. Indonesia Epson Industry\nFinance Department\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550\nTel: +62 21 8970101	PT. Indonesia Epson Industry - Main Logistic Hub\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550	8708.29.99	60	2460	6.45	15867	11	1745.37	17612.37	USD	1	2026-09-08 03:40:49
88	INV/2026/08/586	2026-08-24	PT. Toyota Motor Manufacturing Indonesia	CUST-TMMIN-02	Ex-Works	FOB Tanjung Priok	PO-PTTOY-3534	Bracket Engine Mount RH High-Tensile	3	54	\N	\N	\N	PT. Toyota Motor Manufacturing Indonesia\nFinance & Accounting Division\nKawasan KIIC Lot B-1, Karawang Barat 41361\nTel: +62 21 8904500	PT. Toyota Motor Manufacturing Indonesia - Karawang Plant 1\nKawasan KIIC Lot B-1, Karawang Barat 41361	8544.30.00	50	2700	5.25	14175	11	1559.25	15734.25	USD	1	2026-09-08 03:40:49
89	INV/2026/08/703	2026-08-31	PT. Yamaha Indonesia Motor Mfg.	CUST-YIMM-04	Ex-Works	Franco Cikarang	PO-PTYAM-3719	Shaft Drive Axle Front Precision Ground	2	32	\N	\N	\N	PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920	PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat	8503.00.90	25	800	12.8	10240	11	1126.4	11366.4	USD	1	2026-09-08 03:40:49
\.


--
-- Data for Name: packing_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.packing_lists (id, invoice_number, invoice_date, customer_name, customer_po_no, part_name, terms_of_delivery, box_qty, pallet_qty, length, width, height, unit_note, image_url, notes, items, is_dummy, created_at) FROM stdin;
70	INV/2026/04/165	2026-04-08	PT. Denso Indonesia	PO-PTDEN-7029	Pinion Gear Transmission Planetary Type (GR-PIN-902)	Ex-Works	39	2	350	250	200	mm	\N	\N	\N	1	2026-09-08 03:40:48
71	INV/2026/06/231	2026-06-08	PT. Yamaha Indonesia Motor Mfg.	PO-PTYAM-3806	Shaft Drive Axle Front Precision Ground (SHF-AX-554)	Ex-Works	34	2	600	120	120	mm	\N	\N	\N	1	2026-09-08 03:40:48
72	INV/2026/06/777	2026-06-20	PT. Toyota Motor Manufacturing Indonesia	PO-PTTOY-4192	Cover Side Upper LH - Matte Black Spec (CVR-SD-102)	Ex-Works	50	3	500	220	160	mm	\N	\N	\N	1	2026-09-08 03:40:48
73	INV/2026/08/649	2026-08-05	PT. Yamaha Indonesia Motor Mfg.	PO-PTYAM-5086	Pinion Gear Transmission Planetary Type (GR-PIN-902)	Ex-Works	56	3	350	250	200	mm	\N	\N	\N	1	2026-09-08 03:40:48
74	INV/2026/08/367	2026-08-14	PT. Yamaha Indonesia Motor Mfg.	PO-PTYAM-9723	Housing Clutch Outer Stamping Spec A (HSG-CL-880)	FOB Tanjung Priok	26	2	320	320	180	mm	\N	\N	\N	1	2026-09-08 03:40:48
75	INV/2026/08/175	2026-08-17	PT. Yamaha Indonesia Motor Mfg.	PO-PTYAM-9430	Housing Clutch Outer Stamping Spec A (HSG-CL-880)	Franco Cikarang	50	3	320	320	180	mm	\N	\N	\N	1	2026-09-08 03:40:48
76	INV/2026/08/133	2026-08-21	PT. Indonesia Epson Industry	PO-PTIND-7023	Pinion Gear Transmission Planetary Type (GR-PIN-902)	CIF Tanjung Priok	41	3	350	250	200	mm	\N	\N	\N	1	2026-09-08 03:40:49
77	INV/2026/08/586	2026-08-24	PT. Toyota Motor Manufacturing Indonesia	PO-PTTOY-3534	Bracket Engine Mount RH High-Tensile (BKT-ENG-001)	FOB Tanjung Priok	54	3	400	250	200	mm	\N	\N	\N	1	2026-09-08 03:40:49
78	INV/2026/08/703	2026-09-01	PT. Yamaha Indonesia Motor Mfg.	PO-PTYAM-3719	Shaft Drive Axle Front Precision Ground (SHF-AX-554)	Franco Cikarang	32	2	600	120	120	mm	\N	\N	\N	1	2026-09-08 03:40:49
\.


--
-- Data for Name: part_price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.part_price_history (id, part_id, price, currency, effective_date, notes, created_at) FROM stdin;
262	149	6.1275	USD	2026-04-08	Penetapan harga awal tahun	2026-09-08 03:40:43
263	149	6.45	USD	2026-07-08	Penyesuaian fluktuasi bahan baku	2026-09-08 03:40:43
264	150	4.9875	USD	2026-04-08	Penetapan harga awal tahun	2026-09-08 03:40:43
265	150	5.25	USD	2026-07-08	Penyesuaian fluktuasi bahan baku	2026-09-08 03:40:43
266	151	2.7075	USD	2026-04-08	Penetapan harga awal tahun	2026-09-08 03:40:43
267	151	2.85	USD	2026-07-08	Penyesuaian fluktuasi bahan baku	2026-09-08 03:40:43
268	152	8.0275	USD	2026-04-08	Penetapan harga awal tahun	2026-09-08 03:40:43
269	152	8.45	USD	2026-07-08	Penyesuaian fluktuasi bahan baku	2026-09-08 03:40:43
270	153	12.16	USD	2026-04-08	Penetapan harga awal tahun	2026-09-08 03:40:43
271	153	12.8	USD	2026-07-08	Penyesuaian fluktuasi bahan baku	2026-09-08 03:40:43
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parts (id, part_name, part_no, length, width, height, unit, qty_per_box, price, is_dummy, created_at) FROM stdin;
149	Pinion Gear Transmission Planetary Type	GR-PIN-902	350	250	200	mm	60	6.45	1	2026-09-08 03:40:43
150	Bracket Engine Mount RH High-Tensile	BKT-ENG-001	400	250	200	mm	50	5.25	1	2026-09-08 03:40:43
151	Cover Side Upper LH - Matte Black Spec	CVR-SD-102	500	220	160	mm	80	2.85	1	2026-09-08 03:40:43
152	Housing Clutch Outer Stamping Spec A	HSG-CL-880	320	320	180	mm	40	8.45	1	2026-09-08 03:40:43
153	Shaft Drive Axle Front Precision Ground	SHF-AX-554	600	120	120	mm	25	12.8	1	2026-09-08 03:40:43
\.


--
-- Data for Name: payment_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_terms (id, name, description) FROM stdin;
52	Net 30 Days	Ketentuan pembayaran Net 30 Days
53	Net 45 Days	Ketentuan pembayaran Net 45 Days
54	Net 60 Days	Ketentuan pembayaran Net 60 Days
55	Ex-Works	Ketentuan pembayaran Ex-Works
56	COD (Cash On Delivery)	Ketentuan pembayaran COD (Cash On Delivery)
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, company_name, company_address_line1, company_address_line2, company_phone, company_fax, company_website, company_logo_url, iso_cert_logo_url, tuv_cert_logo_url, hts_code_invoice, hts_code_do, bank_drawn_in_favour, bank_name, bank_account_no, bank_swift_code, bank_branch, bank_currency, country_of_origin, manufacture_name_address, prepared_by_name, prepared_by_title, prepared_by_sign_url, authorized_sign_name, authorized_sign_title, authorized_sign_url, doc_control_code, show_letterhead, pl_prepared_by_name, pl_prepared_by_title, pl_authorized_name, pl_authorized_title, pl_doc_control_code, do_drawn_in_favour, do_sign_col1_title, do_sign_col1_name, do_sign_col2_title, do_sign_col2_name, do_sign_col3_title, do_sign_col3_name, do_sign_col4_title, do_sign_col4_name, do_sign_col5_title, do_sign_col5_name, do_sign_col6_title, do_sign_col6_name, do_doc_control_code, updated_at) FROM stdin;
1	PT. P						/uploads/drawing-1788752149146-891767047.jfif	/uploads/drawing-1788752247483-83724757.png	/uploads/drawing-1788752251270-753540181.png	8504.40.90	8504.40.00						USD										0	Staff Warehouse	Prepared By	Warehouse Supervisor	Authorized Signature	FRM-WHS-02 Rev.01	PT. P	Prepared By		Checked By		Approved By		Security		Driver		Received By		FRM-WHS-01 Rev.00	2026-09-08 04:10:04
\.


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 124, true);


--
-- Name: data_logger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.data_logger_id_seq', 220, true);


--
-- Name: delivery_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_orders_id_seq', 53, true);


--
-- Name: delivery_terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_terms_id_seq', 54, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 89, true);


--
-- Name: packing_lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.packing_lists_id_seq', 78, true);


--
-- Name: part_price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.part_price_history_id_seq', 271, true);


--
-- Name: parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parts_id_seq', 153, true);


--
-- Name: payment_terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_terms_id_seq', 56, true);


--
-- Name: customers customers_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_id_key UNIQUE (customer_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: data_logger data_logger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_logger
    ADD CONSTRAINT data_logger_pkey PRIMARY KEY (id);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: delivery_terms delivery_terms_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_terms
    ADD CONSTRAINT delivery_terms_name_key UNIQUE (name);


--
-- Name: delivery_terms delivery_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_terms
    ADD CONSTRAINT delivery_terms_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: packing_lists packing_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_pkey PRIMARY KEY (id);


--
-- Name: part_price_history part_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_price_history
    ADD CONSTRAINT part_price_history_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: payment_terms payment_terms_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_name_key UNIQUE (name);


--
-- Name: payment_terms payment_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: idx_dl_customer_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dl_customer_name ON public.data_logger USING btree (customer_name);


--
-- Name: idx_dl_doc_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dl_doc_date ON public.data_logger USING btree (doc_date);


--
-- Name: idx_dl_doc_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dl_doc_number ON public.data_logger USING btree (doc_number);


--
-- Name: idx_dl_doc_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dl_doc_type ON public.data_logger USING btree (doc_type);


--
-- Name: idx_dl_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dl_is_deleted ON public.data_logger USING btree (is_deleted);


--
-- Name: idx_do_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_do_number ON public.delivery_orders USING btree (do_number);


--
-- Name: idx_inv_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_number ON public.invoices USING btree (invoice_number);


--
-- Name: idx_pl_inv_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pl_inv_number ON public.packing_lists USING btree (invoice_number);


--
-- Name: part_price_history part_price_history_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_price_history
    ADD CONSTRAINT part_price_history_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 8NsBRx71mj2i19LXs23Kbc4x1NkLWlCxwml4r5haz6eQLgmC6dM26gjH3zSGf1g

