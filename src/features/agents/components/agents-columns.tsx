import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type Agent } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const agentsColumns: ColumnDef<Agent>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Agent' />
    ),
    cell: ({ row }) => <LongText>{row.getValue('name')}</LongText>,
  },

  {
    accessorKey: 'provider',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Provider' />
    ),
  },

  {
    accessorKey: 'model',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Model' />
    ),
  },

  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.original.status

      const variant =
        status === 'running'
          ? 'default'
          : status === 'idle'
            ? 'secondary'
            : 'destructive'

      return (
        <Badge variant={variant} className='capitalize'>
          {status}
        </Badge>
      )
    },
  },

  {
    accessorKey: 'tasks',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tasks' />
    ),
  },

  {
    accessorKey: 'responseTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Response' />
    ),
  },

  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
  },

  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]
