import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  try {
    const { flowId } = await params;
    
    if (!flowId) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host');
    const subdomain = host?.split('.')[0];
    
    if (!subdomain) {
      console.error('[subdomain-api] No subdomain found in host:', host);
      return NextResponse.json(
        { error: 'Invalid subdomain' },
        { status: 400 }
      );
    }

    const mainAppUrl = process.env.LLMC_BACKEND_URL;
    
    let actualFlowId = flowId; 
    let apiKey: string = '';
    
    try {
      const dashboardResponse = await fetch(`${mainAppUrl}/api/v1/auth/subdomain/${subdomain}/dashboard`);
      
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        
        const flow = dashboardData.flows?.find((f: any) => f.id === flowId);
        
        if (flow && flow.flow_id) {
          actualFlowId = flow.flow_id;
        } else {
          console.warn('[subdomain-api] Flow not found in dashboard or no flow_id');
        }
      } else {
        const errorText = await dashboardResponse.text();
      }
    } catch (error) {
      console.error('[subdomain-api] Error fetching dashboard data:', error);
    }

    const apiKeyResponse = await fetch(`${mainAppUrl}/api/v1/auth/subdomain/get-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subdomain,
        flowId 
      })
    });


    if (!apiKeyResponse.ok) {
      const errorText = await apiKeyResponse.text();
      console.error('[subdomain-api] Failed to get API key:', apiKeyResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to authenticate for flow access', details: errorText },
        { status: 403 }
      );
    }

    const apiKeyData = await apiKeyResponse.json();
    
    if (!apiKeyData.success) {
      console.error('[subdomain-api] API key request unsuccessful:', apiKeyData);
      return NextResponse.json(
        { error: apiKeyData.message || 'Failed to get API key' },
        { status: 403 }
      );
    }

    apiKey = apiKeyData.apiKey;
    
    
    const flowResponse = await fetch(`${mainAppUrl}/api/v1/flows/${actualFlowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });


    if (!flowResponse.ok) {
      const errorText = await flowResponse.text();
      console.error('[subdomain-api] Failed to fetch flow from main app:', flowResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch flow data', details: errorText },
        { status: flowResponse.status }
      );
    }

    const flowData = await flowResponse.json();

    const inputs: any = {};
    
    if (flowData.data && flowData.data.nodes && flowData.data.edges) {
      const nodes = flowData.data.nodes;
      const edges = flowData.data.edges;
      
      const isConnectedToAnyComponent = (nodeId: string): boolean => {
        return edges.some((edge: any) => edge.source === nodeId);
      };
      
      const chatInputNodes = nodes
        .filter((n: any) => n.data?.type === 'ChatInput')
        .filter((n: any) => isConnectedToAnyComponent(n.id));
      
      const textInputNodes = nodes
        .filter((n: any) => n.data?.type === 'TextInput')
        .filter((n: any) => isConnectedToAnyComponent(n.id));
      
      const fileLoaderNodes = nodes.filter((n: any) => n.data?.type === 'File');
      
      console.log('[subdomain-api] Flow analysis:', {
        chatInputNodes: chatInputNodes.length,
        textInputNodes: textInputNodes.length,
        fileLoaderNodes: fileLoaderNodes.length
      });
      
      if (chatInputNodes.length > 0) {
        const chatInputNode = chatInputNodes[0]; // Use first ChatInput node
        const displayName = chatInputNode.data?.node?.display_name || 'Message';
        const description = chatInputNode.data?.node?.description || `Your input message for ${displayName}`;
        
        inputs.input_value = {
          type: 'str',
          display_name: displayName,
          placeholder: 'Enter your message or question here...',
          required: true,
          multiline: true,
          info: description
        };
      }
      
      textInputNodes.forEach((node: any) => {
        const nodeId = node.id;
        const displayName = node.data?.node?.display_name || `Text Input ${nodeId.slice(-4)}`;
        const description = node.data?.node?.description || `Input for ${displayName}`;
        const value = node.data?.node?.template?.input_value?.value || '';
        
        inputs[nodeId] = {
          type: 'str',
          display_name: displayName,
          placeholder: value || 'Enter text...',
          required: false,
          multiline: false,
          info: description
        };
      });
      
      fileLoaderNodes.forEach((node: any) => {
        const nodeId = node.id;
        const displayName = node.data?.node?.display_name || `File Input ${nodeId.slice(-4)}`;
        const description = node.data?.node?.description || `File input for ${displayName}`;
        
        inputs[nodeId] = {
          type: 'file',
          display_name: displayName,
          placeholder: '',
          required: false,
          temp_file: true,
          info: description
        };
      });
    }

    if (Object.keys(inputs).length === 0) {
      console.log('[subdomain-api] No connected input nodes found, defaulting to message input');
      inputs.input_value = {
        type: 'str',
        display_name: 'Message',
        placeholder: 'Enter your message or question here...',
        required: true,
        multiline: true,
        info: 'Your input message for the flow'
      };
    }

    const schema = {
      flowId: actualFlowId, 
      subdomainConfigId: flowId, 
      flowName: flowData.name,
      inputs
    };

    
    return NextResponse.json(schema);

  } catch (error) {
    const { flowId } = await params;
    return NextResponse.json(
      { 
        error: 'Failed to generate flow schema', 
        details: error instanceof Error ? error.message : 'Unknown error',
        flowId,
        subdomain: request.headers.get('host')?.split('.')[0]
      },
      { status: 500 }
    );
  }
}