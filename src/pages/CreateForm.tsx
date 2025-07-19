import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FormField {
  id: string;
  field_type: string;
  field_name: string;
  label: string;
  is_required: boolean;
  validation_rules: any;
  options: any;
  conditional_logic?: {
    show_when_field: string;
    show_when_value: string;
  };
}

interface FormData {
  name: string;
  title: string;
  description: string;
  slug: string;
  fields: FormField[];
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Upload" },
];

export default function CreateForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    title: "",
    description: "",
    slug: "",
    fields: [],
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleBasicInfoChange = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'name') {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      field_type: "text",
      field_name: `field_${formData.fields.length + 1}`,
      label: `Field ${formData.fields.length + 1}`,
      is_required: false,
      validation_rules: {},
      options: {},
      conditional_logic: undefined,
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId),
    }));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newFields = Array.from(formData.fields);
    const [reorderedItem] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({ ...prev, fields: newFields }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.title || formData.fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and add at least one form field",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create the form
      const { data: form, error: formError } = await supabase
        .from('custom_forms')
        .insert({
          name: formData.name,
          title: formData.title,
          description: formData.description,
          slug: formData.slug,
        })
        .select()
        .single();

      if (formError) throw formError;

      // Create the form fields
      const fieldsToInsert = formData.fields.map((field, index) => ({
        form_id: form.id,
        field_type: field.field_type,
        field_name: field.field_name,
        label: field.label,
        is_required: field.is_required,
        validation_rules: field.validation_rules,
        options: field.options,
        conditional_logic: field.conditional_logic,
        order_index: index,
      }));

      const { error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      toast({
        title: "Success",
        description: "Form created successfully",
      });

      navigate('/forms');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create form",
        variant: "destructive",
      });
      console.error('Error creating form:', error);
    } finally {
      setLoading(false);
    }
  };

  if (previewMode) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Form Preview</h1>
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            Back to Editor
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{formData.title}</CardTitle>
            {formData.description && (
              <p className="text-muted-foreground">{formData.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.is_required && <span className="text-destructive">*</span>}
                </Label>
                {field.field_type === "textarea" ? (
                  <Textarea placeholder={`Enter ${field.label.toLowerCase()}`} />
                ) : field.field_type === "select" ? (
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
            <Button className="w-full">Submit</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Custom Form</h1>
          <p className="text-muted-foreground">Build a custom form for your campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Form"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Configuration */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Form Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Form Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                  placeholder="Enter form name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Form Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleBasicInfoChange('title', e.target.value)}
                  placeholder="Enter form title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                  placeholder="Enter form description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleBasicInfoChange('slug', e.target.value)}
                  placeholder="form-url-slug"
                />
                <p className="text-xs text-muted-foreground">
                  Public URL: /forms/{formData.slug || 'your-slug'}
                </p>
              </div>

              <Separator />

              <Button onClick={addField} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Form Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {formData.fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border rounded-lg p-4 bg-background"
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <span className="font-medium">Field {index + 1}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeField(field.id)}
                                  className="ml-auto"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Field Type</Label>
                                  <Select
                                    value={field.field_type}
                                    onValueChange={(value) => updateField(field.id, { field_type: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Field Name</Label>
                                  <Input
                                    value={field.field_name}
                                    onChange={(e) => updateField(field.id, { field_name: e.target.value })}
                                    placeholder="field_name"
                                  />
                                </div>

                                <div className="space-y-2 col-span-2">
                                  <Label>Label</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                                    placeholder="Field Label"
                                  />
                                </div>

                                <div className="flex items-center space-x-2 col-span-2">
                                  <Checkbox
                                    id={`required-${field.id}`}
                                    checked={field.is_required}
                                    onCheckedChange={(checked) => 
                                      updateField(field.id, { is_required: !!checked })
                                    }
                                  />
                                  <Label htmlFor={`required-${field.id}`}>Required field</Label>
                                </div>

                                {/* Options for select, radio, checkbox fields */}
                                {['select', 'radio', 'checkbox'].includes(field.field_type) && (
                                  <div className="space-y-2 col-span-2">
                                    <Label>Options (one per line)</Label>
                                    <Textarea
                                      value={Array.isArray(field.options) ? field.options.join('\n') : ''}
                                      onChange={(e) => updateField(field.id, { 
                                        options: e.target.value.split('\n').filter(opt => opt.trim()) 
                                      })}
                                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                                      rows={3}
                                    />
                                  </div>
                                )}

                                {/* Conditional Logic */}
                                <div className="space-y-3 col-span-2 p-3 bg-muted/50 rounded-lg">
                                  <Label className="text-sm font-medium">Conditional Logic (Optional)</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Show this field only when another field has a specific value
                                  </p>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs">Show when field:</Label>
                                      <Select
                                        value={field.conditional_logic?.show_when_field || ''}
                                        onValueChange={(value) => updateField(field.id, { 
                                          conditional_logic: value ? {
                                            show_when_field: value,
                                            show_when_value: field.conditional_logic?.show_when_value || ''
                                          } : undefined
                                        })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="">None</SelectItem>
                                          {formData.fields
                                            .filter(f => f.id !== field.id && ['select', 'radio'].includes(f.field_type))
                                            .map(f => (
                                              <SelectItem key={f.id} value={f.field_name}>
                                                {f.label}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Equals value:</Label>
                                      <Input
                                        value={field.conditional_logic?.show_when_value || ''}
                                        onChange={(e) => updateField(field.id, { 
                                          conditional_logic: field.conditional_logic ? {
                                            ...field.conditional_logic,
                                            show_when_value: e.target.value
                                          } : undefined
                                        })}
                                        placeholder="Enter value"
                                        disabled={!field.conditional_logic?.show_when_field}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {formData.fields.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No fields added yet. Click "Add Field" to get started.
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}