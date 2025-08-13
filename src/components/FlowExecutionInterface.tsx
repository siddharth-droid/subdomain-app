'use client';

import { useState, useEffect } from 'react';
import DynamicFormBuilder, { InputField, FlowFormData } from './DynamicFormBuilder';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface FlowExecutionProps {
  flowId: string; 
  flowName: string;
  subdomain: string;
  actualFlowId?: string;
}

export interface ExecutionState {
  status: 'idle' | 'preparing' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  result?: any;
  error?: string;
}

export default function FlowExecutionInterface({ flowId, subdomain, actualFlowId }: FlowExecutionProps) {
  const [fields, setFields] = useState<InputField[]>([]);
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
    message: 'Ready to execute'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedFlowId, setResolvedFlowId] = useState<string>(actualFlowId || flowId);
  const [apiKey, setApiKey] = useState<string>('');
  const [showAdvancedResult, setShowAdvancedResult] = useState(false);

  // Helper function to extract text content from flow result
  const extractTextContent = (result: any): string | null => {
    try {
      if (typeof result === 'string') {
        return result;
      }
      
      if (result?.result?.outputs) {
        for (const output of result.result.outputs) {
          if (output.outputs) {
            for (const outputItem of output.outputs) {
              if (outputItem.results?.text?.data?.text) {
                return outputItem.results.text.data.text;
              }
            }
          }
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error extracting text content:', e);
      return null;
    }
  };

  // Load flow input schema and API key
  useEffect(() => {
    async function loadFlowSchema() {
      try {
        setLoading(true);
        
        
        const response = await fetch(`/api/flows/${flowId}/schema`);
        
        if (!response.ok) {
          throw new Error('Failed to load flow schema');
        }
        
        const schema = await response.json();
        
        if (schema.flowId) {
          setResolvedFlowId(schema.flowId);
        }
        
        const inputFields: InputField[] = Object.entries(schema.inputs || {}).map(([key, fieldData]: [string, any]) => ({
          id: key,
          name: key,
          type: fieldData.type || 'str',
          display_name: fieldData.display_name || key,
          placeholder: fieldData.placeholder || '',
          required: key === 'input_value' ? false : (fieldData.required || false),
          value: fieldData.value,
          list: fieldData.list || false,
          multiline: fieldData.multiline || false,
          password: fieldData.password || false,
          options: fieldData.options,
          temp_file: fieldData.temp_file || false,
          info: fieldData.info || fieldData.description
        }));
        
        setFields(inputFields);
        
      } catch (err) {
        console.error('Error loading flow schema:', err);
        setError(err instanceof Error ? err.message : 'Failed to load flow');
        
        const demoFields = [
          {
            id: 'input_text',
            name: 'input_text',
            display_name: 'Input Text',
            type: 'str',
            placeholder: 'Enter your text here...',
            required: true,
            multiline: true,
            info: 'The main text input for processing'
          },
          {
            id: 'temperature',
            name: 'temperature',
            display_name: 'Temperature',
            type: 'float',
            placeholder: '0.7',
            required: false,
            info: 'Controls randomness in the output (0.0 to 1.0)'
          }
        ];
        setFields(demoFields);
        
      } finally {
        setLoading(false);
      }
    }

    async function loadApiKey() {
      try {
        const apiKeyResponse = await fetch('/api/subdomain/get-api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subdomain,
            flowId
          })
        });

        if (apiKeyResponse.ok) {
          const apiKeyData = await apiKeyResponse.json();
          if (apiKeyData.success) {
            setApiKey(apiKeyData.apiKey);
          }
        }
      } catch (err) {
        console.error('Error loading API key:', err);
      }
    }

    if (flowId || actualFlowId) {
      loadFlowSchema();
      loadApiKey();
    }
  }, [flowId, actualFlowId, subdomain]);

  const executeFlow = async (formData: FlowFormData, files: { [key: string]: File }) => {
    let progressInterval: NodeJS.Timeout | null = null;
    let currentProgress = 0;

    try {
      setExecutionState({
        status: 'running',
        progress: 0,
        message: 'Running...'
      });

      if (!apiKey) {
        throw new Error('API key not available. Please try refreshing the page.');
      }

      progressInterval = setInterval(() => {
        currentProgress += 0.5;
        if (currentProgress <= 99) {
          setExecutionState(prev => ({
            ...prev,
            progress: Math.floor(currentProgress),
            message: 'Running...'
          }));
        }
      }, 100); 


      const payload: any = {};
      
      if (formData.input_value !== undefined) {
        payload.input_value = formData.input_value;
        payload.output_type = "chat";
        payload.input_type = "chat";
      }
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'input_value') {
          const field = fields.find(f => f.id === key);
          if (field?.temp_file) {
            if (files[key]) {
              payload[key] = {
                file_paths: [files[key].name],
                input_type: "file",
                output_type: "file"
              };
            } else if (value && typeof value === 'string' && value.trim()) {
              const filePaths = value
                .split('\n')
                .map(path => path.trim())
                .filter(path => path.length > 0);
              
              payload[key] = {
                file_paths: filePaths,
                input_type: "file",
                output_type: "file"
              };
            }
          } else if (field?.type === 'str') {
            // Handle text inputs
            payload[key] = {
              value: value,
              output_type: "text",
              input_type: "text"
            };
          }
        }
      });
      
      const fileFields = fields.filter(f => f.temp_file);
      if (fileFields.length > 0) {
        fileFields.forEach(field => {
          const fieldValue = formData[field.id];
          const hasFile = !!files[field.id];
          const hasTextPaths = fieldValue && typeof fieldValue === 'string' && fieldValue.trim();
          
          console.log(`  - Field ${field.id}:`, {
            hasUploadedFile: hasFile,
            hasTextPaths: !!hasTextPaths,
            textValue: hasTextPaths ? fieldValue : null,
            payloadStructure: payload[field.id] || 'NOT INCLUDED'
          });
        });
      }
      
      if (Object.keys(files).length > 0) {
        console.warn('[FlowExecution] File upload not yet implemented');
      }
      
      const executionResponse = await fetch(`/api/flows/${resolvedFlowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!executionResponse.ok) {
        const errorData = await executionResponse.json();
        throw new Error(errorData.message || 'Flow execution failed');
      }

      const result = await executionResponse.json();

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      setExecutionState({
        status: 'running',
        progress: 100,
        message: 'Running...'
      });

      setTimeout(() => {
        setExecutionState({
          status: 'completed',
          progress: 100,
          message: 'Flow completed successfully!',
          result
        });
      }, 500);

    } catch (err) {
      console.error('Flow execution error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setExecutionState({
        status: 'error',
        progress: 0,
        message: 'Execution failed',
        error: errorMessage
      });
    }
  };

  const handleReset = () => {
    setExecutionState({
      status: 'idle',
      progress: 0,
      message: 'Ready to execute'
    });
  };


  const renderExecutionStatus = () => {
    const { status, progress, message, result, error: execError } = executionState;

    if (status === 'idle') {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold leading-none">Execution Status</h3>
          <div className="flex items-center space-x-2">
            {status === 'preparing' || status === 'running' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            ) : status === 'completed' ? (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : status === 'error' ? (
              <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-destructive-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            ) : null}
            <span className={cn(
              "text-sm font-medium",
              status === 'completed' && 'text-green-600',
              status === 'error' && 'text-destructive', 
              (status === 'preparing' || status === 'running') && 'text-primary'
            )}>
              {status === 'preparing' ? 'Preparing' :
               status === 'running' ? 'Running' :
               status === 'completed' ? 'Completed' :
               status === 'error' ? 'Error' : ''}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {progress > 0 && status !== 'completed' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>{message}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {status === 'completed' && result && (
            <div className="space-y-4">
              {/* Main Result - Text Content Only */}
              {(() => {
                const textContent = extractTextContent(result);
                return textContent ? (
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Result:</h4>
                    <Markdown 
                      remarkPlugins={[remarkGfm]} 
                      className="prose prose-sm max-w-none prose-slate dark:prose-invert overflow-x-auto"
                    >
                      {textContent}
                    </Markdown>
                  </div>
                ) : (
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Result:</h4>
                    <pre className="text-sm text-foreground whitespace-pre-wrap overflow-x-auto">
                      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                );
              })()}

              {/* Advanced Result Toggle */}
              <div className="border-t border-border pt-4">
                <button
                  onClick={() => setShowAdvancedResult(!showAdvancedResult)}
                  className="flex items-center space-x-2 text-sm text-white hover:text-gray-200 transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showAdvancedResult ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{showAdvancedResult ? 'Hide' : 'Show'} Advanced Result</span>
                </button>

                {showAdvancedResult && (
                  <div className="mt-3 p-4 bg-muted border border-border rounded-lg">
                    <h5 className="font-medium text-foreground mb-2">Full Response Data:</h5>
                    <pre className="text-xs text-white whitespace-pre-wrap overflow-x-auto bg-muted p-3 rounded border border-border">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {status === 'error' && execError && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h4 className="font-semibold text-destructive mb-2">Error:</h4>
              <p className="text-sm text-destructive/90">{execError}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/20 shadow-2xl">
        <CardContent className="text-center py-12 space-y-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground border-t-transparent"></div>
          <p className="text-muted-foreground">Loading flow interface...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && fields.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/20 shadow-2xl">
        <CardContent className="text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Flow</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4">
      {error && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-yellow-600">
            ⚠️ Using demo interface: {error}
          </p>
        </div>
      )}

      <DynamicFormBuilder
        fields={fields}
        onSubmit={executeFlow}
        onReset={handleReset}
        isSubmitting={executionState.status === 'preparing' || executionState.status === 'running'}
        submitLabel="Execute Flow"
        resetLabel="Clear Form"
        apiKey={apiKey}
        className="space-y-8"
      />

      {renderExecutionStatus()}
    </div>
  );
}