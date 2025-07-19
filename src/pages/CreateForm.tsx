import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Eye, FileText } from "lucide-react";
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg mb-6">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Form Preview
                  </CardTitle>
                  <Button variant="outline" onClick={() => setPreviewMode(false)}>
                    Back to Editor
                  </Button>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                <CardTitle>{formData.title}</CardTitle>
                {formData.description && (
                  <p className="text-muted-foreground mt-2">{formData.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {formData.fields.map((field) => (
                  <div key={field.id} className="space-y-3">
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.field_type === "textarea" ? (
                      <Textarea 
                        placeholder={`Enter ${field.label.toLowerCase()}`} 
                        className="min-h-[100px]"
                      />
                    ) : field.field_type === "select" ? (
                      <Select>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(field.options) && field.options.length > 0 ? (
                            field.options.map((option, index) => (
                              <SelectItem key={index} value={option}>
                                {option}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="option1">Option 1</SelectItem>
                              <SelectItem value="option2">Option 2</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="h-11"
                      />
                    )}
                  </div>
                ))}
                <Button className="w-full h-12 text-base font-medium">Submit Form</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <Card className="shadow-lg mb-8">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Create Custom Form
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Build a custom form for your campaigns with conditional logic and professional styling
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewMode(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading} className="px-6">
                    {loading ? "Creating..." : "Create Form"}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Configuration */}
            <div className="lg:col-span-1">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <CardTitle className="text-lg">Form Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium">Form Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                      placeholder="Enter form name"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-medium">Form Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleBasicInfoChange('title', e.target.value)}
                      placeholder="Enter form title"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                      placeholder="Enter form description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="slug" className="text-sm font-medium">Form URL Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleBasicInfoChange('slug', e.target.value)}
                      placeholder="form-url-slug"
                      className="h-11 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Public URL: /forms/{formData.slug || 'your-slug'}
                    </p>
                  </div>

                  <Separator />

                  <Button
                    onClick={addField}
                    variant="outline"
                    className="w-full h-12 border-dashed border-2 hover:border-primary/50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Field
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Form Fields Builder */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <CardTitle className="text-lg">Form Fields</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag and drop to reorder fields. Configure each field's properties and conditional logic.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {formData.fields.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                      <div className="text-muted-foreground mb-4">
                        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No fields added yet</p>
                        <p className="text-sm">Click "Add New Field" to start building your form</p>
                      </div>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="form-fields">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-4"
                          >
                            {formData.fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`border-2 transition-all duration-200 ${
                                      snapshot.isDragging 
                                        ? 'border-primary shadow-lg scale-105' 
                                        : 'border-border hover:border-primary/50'
                                    }`}
                                  >
                                    <CardHeader className="pb-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="p-1 hover:bg-muted rounded cursor-grab"
                                          >
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <div>
                                            <CardTitle className="text-base">
                                              {field.label || `Field ${index + 1}`}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground capitalize">
                                              {field.field_type.replace('_', ' ')} field
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeField(field.id)}
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </CardHeader>
                                    
                                    <CardContent className="pt-0">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                          <Label className="text-sm font-medium">Field Label</Label>
                                          <Input
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            placeholder="Enter field label"
                                            className="h-10"
                                          />
                                        </div>

                                        <div className="space-y-3">
                                          <Label className="text-sm font-medium">Field Name</Label>
                                          <Input
                                            value={field.field_name}
                                            onChange={(e) => updateField(field.id, { field_name: e.target.value })}
                                            placeholder="field_name"
                                            className="h-10 font-mono text-sm"
                                          />
                                        </div>

                                        <div className="space-y-3">
                                          <Label className="text-sm font-medium">Field Type</Label>
                                          <Select
                                            value={field.field_type}
                                            onValueChange={(value) => updateField(field.id, { field_type: value })}
                                          >
                                            <SelectTrigger className="h-10">
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

                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`required-${field.id}`}
                                            checked={field.is_required}
                                            onCheckedChange={(checked) => 
                                              updateField(field.id, { is_required: !!checked })
                                            }
                                          />
                                          <Label htmlFor={`required-${field.id}`} className="text-sm font-medium">
                                            Required field
                                          </Label>
                                        </div>

                                        {/* Options for select, radio, checkbox fields */}
                                        {['select', 'radio', 'checkbox'].includes(field.field_type) && (
                                          <div className="space-y-3 md:col-span-2">
                                            <Label className="text-sm font-medium">Options (one per line)</Label>
                                            <Textarea
                                              value={Array.isArray(field.options) ? field.options.join('\n') : ''}
                                              onChange={(e) => updateField(field.id, { 
                                                options: e.target.value.split('\n').filter(opt => opt.trim()) 
                                              })}
                                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                                              rows={3}
                                              className="font-mono text-sm"
                                            />
                                          </div>
                                        )}

                                        {/* Conditional Logic */}
                                        <div className="space-y-4 md:col-span-2 p-4 bg-muted/30 rounded-lg border">
                                          <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 bg-primary rounded-full"></div>
                                            <Label className="text-sm font-medium">Conditional Logic (Optional)</Label>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            Show this field only when another field has a specific value
                                          </p>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label className="text-xs font-medium">Show when field:</Label>
                                              <Select
                                                value={field.conditional_logic?.show_when_field || 'none'}
                                                onValueChange={(value) => updateField(field.id, { 
                                                  conditional_logic: value !== 'none' ? {
                                                    show_when_field: value,
                                                    show_when_value: field.conditional_logic?.show_when_value || ''
                                                  } : undefined
                                                })}
                                              >
                                                <SelectTrigger className="h-9">
                                                  <SelectValue placeholder="Select field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="none">None</SelectItem>
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
                                              <Label className="text-xs font-medium">Equals value:</Label>
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
                                                className="h-9"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}