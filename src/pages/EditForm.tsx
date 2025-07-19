import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  order_index: number;
  conditional_logic?: {
    show_when_field: string;
    show_when_value: string;
  };
}

interface CustomForm {
  id: string;
  name: string;
  title: string;
  description: string;
  slug: string;
  is_active: boolean;
  settings: any;
}

export default function EditForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      // Fetch form details
      const { data: formData, error: formError } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('id', id)
        .single();

      if (formError) throw formError;
      setForm(formData);

      // Fetch form fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', id)
        .order('order_index');

      if (fieldsError) throw fieldsError;
      setFields((fieldsData || []).map(field => ({
        ...field,
        conditional_logic: field.conditional_logic as FormField['conditional_logic']
      })));
    } catch (error: any) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to load form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: `temp-${Date.now()}`,
      field_type: "text",
      field_name: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      is_required: false,
      validation_rules: {},
      options: {},
      order_index: fields.length,
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((field, i) => i === index ? { ...field, ...updates } : field));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedFields = Array.from(fields);
    const [removed] = reorderedFields.splice(result.source.index, 1);
    reorderedFields.splice(result.destination.index, 0, removed);

    setFields(reorderedFields.map((field, index) => ({ ...field, order_index: index })));
  };

  const handleSave = async () => {
    if (!form) return;
    
    setIsSubmitting(true);
    
    try {
      // Update form details
      const { error: formError } = await supabase
        .from('custom_forms')
        .update({
          name: form.name,
          title: form.title,
          description: form.description,
          slug: form.slug,
          is_active: form.is_active,
        })
        .eq('id', form.id);

      if (formError) throw formError;

      // Delete existing fields
      const { error: deleteError } = await supabase
        .from('form_fields')
        .delete()
        .eq('form_id', form.id);

      if (deleteError) throw deleteError;

      // Insert updated fields
      const fieldsToInsert = fields.map(({ id, ...field }) => ({
        ...field,
        form_id: form.id,
      }));

      const { error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      toast({
        title: "Success",
        description: "Form updated successfully",
      });

      navigate('/forms');
    } catch (error: any) {
      console.error('Error saving form:', error);
      toast({
        title: "Error",
        description: "Failed to save form",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Form not found</h1>
            <Button onClick={() => navigate('/forms')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/forms')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Form</h1>
                <p className="text-gray-600">Modify your custom form</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.open(`/forms/${form.slug}`, '_blank')}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="form-name">Form Name</Label>
                  <Input
                    id="form-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter form name"
                  />
                </div>

                <div>
                  <Label htmlFor="form-title">Form Title</Label>
                  <Input
                    id="form-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter form title"
                  />
                </div>

                <div>
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter form description"
                  />
                </div>

                <div>
                  <Label htmlFor="form-slug">URL Slug</Label>
                  <Input
                    id="form-slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="form-url-slug"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Public URL: /forms/{form.slug}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="form-active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <Label htmlFor="form-active">Form is active</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Form Fields</CardTitle>
                  <Button onClick={addField} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-white border rounded-lg p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{field.field_type}</Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeField(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Field Type</Label>
                                    <Select 
                                      value={field.field_type} 
                                      onValueChange={(value) => updateField(index, { field_type: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="phone">Phone</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="textarea">Textarea</SelectItem>
                                        <SelectItem value="select">Select</SelectItem>
                                        <SelectItem value="radio">Radio</SelectItem>
                                        <SelectItem value="checkbox">Checkbox</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="file">File</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Field Name</Label>
                                    <Input
                                      value={field.field_name}
                                      onChange={(e) => updateField(index, { field_name: e.target.value })}
                                      placeholder="field_name"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label>Label</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    placeholder="Field Label"
                                  />
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={field.is_required}
                                    onCheckedChange={(checked) => updateField(index, { is_required: checked })}
                                  />
                                  <Label>Required field</Label>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-lg">
                    <h2 className="text-xl font-semibold">{form.title || "Form Title"}</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {form.description || "Form description will appear here"}
                    </p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-b-lg border">
                    <div className="space-y-4">
                      {fields.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No fields added yet</p>
                      ) : (
                        fields.map((field, index) => (
                          <div key={field.id} className="space-y-2">
                            <Label>
                              {field.label}
                              {field.is_required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <div className="text-sm text-gray-500">
                              {field.field_type} field
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}