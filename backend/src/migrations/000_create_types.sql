-- Create needed types (enums)
CREATE TYPE campaign_status AS ENUM ('Draft', 'Active', 'Completed');
CREATE TYPE msme_category AS ENUM ('Micro', 'Small', 'Medium', 'Others');
CREATE TYPE msme_status AS ENUM ('MSE-Vendor', 'Others');
CREATE TYPE response_status AS ENUM ('Pending', 'Submitted', 'Approved', 'Rejected');